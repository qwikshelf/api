import { useState, useEffect } from "react";
import {
    Search,
    ShoppingCart,
    Plus,
    Minus,
    Trash2,
    CreditCard,
    User,
    Package,
    Warehouse,
    AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { productsApi } from "@/api/products";
import { warehousesApi } from "@/api/warehouses";
import { salesApi } from "@/api/sales";
import { inventoryApi } from "@/api/inventory";
import { cn } from "@/lib/utils";
import type { ProductVariantResponse, WarehouseResponse } from "@/types";

interface CartItem extends ProductVariantResponse {
    cartQuantity: number;
}

export default function POSPage() {
    const [products, setProducts] = useState<ProductVariantResponse[]>([]);
    const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [inventory, setInventory] = useState<Record<number, number>>({});
    const [customerName, setCustomerName] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "upi" | "credit" | "other">("cash");
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedVariant, setSelectedVariant] = useState<Record<number, number>>({});

    const getVariantStock = (variant: ProductVariantResponse, familyVariants: ProductVariantResponse[]) => {
        const factor = parseFloat(variant.conversion_factor || "1");
        const directStock = inventory[variant.id] || 0;

        // If it's a base unit (factor 1), always prefer its own stock record
        if (factor === 1) {
            return directStock;
        }

        // For other units (fractional or bulk), try to scale from the first factor-1 base unit
        const baseVariant = familyVariants.find(v => parseFloat(v.conversion_factor || "1") === 1) || familyVariants[0];
        
        // If the variant IS the baseVariant (e.g. non-1 factor but it's the only one), use its stock
        if (baseVariant.id === variant.id) {
            return directStock;
        }

        const baseStock = inventory[baseVariant.id] || 0;
        return Math.floor(baseStock / factor);
    };

    useEffect(() => {
        fetchWarehouses();
        fetchProducts();
    }, []);

    const fetchWarehouses = async () => {
        try {
            const resp = await warehousesApi.list();
            const data = resp.data.data || [];
            setWarehouses(data);
            if (data.length > 0) {
                setSelectedWarehouseId(resp.data.data[0].id.toString());
            }
        } catch (error) {
            toast.error("Failed to fetch warehouses");
        }
    };

    const fetchProducts = async () => {
        try {
            const resp = await productsApi.list(1, 100);
            setProducts(resp.data.data || []);
        } catch (error) {
            toast.error("Failed to fetch products");
        }
    };

    const fetchInventory = async (warehouseId: string) => {
        if (!warehouseId) return;
        try {
            const resp = await inventoryApi.listByWarehouse(parseInt(warehouseId));
            const stockMap: Record<number, number> = {};
            (resp.data.data || []).forEach(item => {
                stockMap[item.variant_id] = Number(item.quantity);
            });
            setInventory(stockMap);
        } catch (error) {
            console.error("Failed to fetch inventory", error);
        }
    };

    useEffect(() => {
        if (selectedWarehouseId) {
            fetchInventory(selectedWarehouseId);
        }
    }, [selectedWarehouseId]);

    const addToCart = (product: ProductVariantResponse) => {
        // Find all variants in the same family to support shared inventory scaling
        const familyVariants = products.filter(p => p.family_id === product.family_id);
        const currentStock = getVariantStock(product, familyVariants);

        const inCart = cart.find(item => item.id === product.id)?.cartQuantity || 0;

        if (inCart >= currentStock && currentStock > 0) {
            toast.warning(`Only ${currentStock} units available in stock`);
        } else if (currentStock <= 0) {
            toast.error("Out of stock in selected warehouse");
            return;
        }

        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.id === product.id
                        ? { ...item, cartQuantity: item.cartQuantity + 1 }
                        : item
                );
            }
            return [...prev, { ...product, cartQuantity: 1 }];
        });
        toast.success(`Added ${product.name} to cart`);
    };

    const updateQuantity = (id: number, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = Math.max(1, item.cartQuantity + delta);
                return { ...item, cartQuantity: newQty };
            }
            return item;
        }));
    };

    const removeFromCart = (id: number) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const isFractionalProduct = (item: any) => {
        return item.sku?.toUpperCase().includes("RBM");
    };

    const updateQuantityDirect = (id: number, value: string) => {
        const numVal = parseFloat(value);
        if (value === "") {
            setCart(prev => prev.map(item => item.id === id ? { ...item, cartQuantity: 0 } : item));
            return;
        }
        if (isNaN(numVal) || numVal < 0) return;
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, cartQuantity: numVal };
            }
            return item;
        }));
    };

    const subtotal = cart.reduce((sum, item) => sum + (Number(item.selling_price) * item.cartQuantity), 0);
    const tax = 0;
    const total = subtotal + tax;

    const handleCheckout = async () => {
        if (!selectedWarehouseId) {
            toast.error("Please select a warehouse");
            return;
        }
        if (cart.length === 0) {
            toast.error("Cart is empty");
            return;
        }

        setIsProcessing(true);
        try {
            await salesApi.create({
                warehouse_id: parseInt(selectedWarehouseId),
                customer_name: customerName,
                tax_amount: tax,
                discount_amount: 0,
                payment_method: paymentMethod,
                items: cart.map(item => ({
                    variant_id: item.id,
                    quantity: item.cartQuantity,
                    unit_price: Number(item.selling_price)
                }))
            });
            toast.success("Sale processed successfully!");
            setCart([]);
            setCustomerName("");
            if (selectedWarehouseId) {
                fetchInventory(selectedWarehouseId);
            }
        } catch (error: any) {
            const errorMsg = error.response?.data?.error?.message || "Checkout failed";
            toast.error(errorMsg);
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderCartContent = () => (
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-xs font-medium flex items-center gap-1">
                    <User className="h-3 w-3" /> Customer Information
                </label>
                <Input
                    placeholder="Customer Name (Optional)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="bg-background h-10 lg:h-9"
                />
            </div>

            <Separator className="bg-muted-foreground/10" />

            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-xs font-medium">Cart Items</span>
                    <Badge variant="outline">{cart.length} items</Badge>
                </div>

                {cart.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">Your cart is empty</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {cart.map((item) => (
                            <div key={item.id} className="flex gap-3 bg-background p-3 rounded-lg border shadow-sm group">
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-semibold truncate leading-none mb-1">{item.name}</h4>
                                    <p className="text-xs text-muted-foreground">₹{item.selling_price} × {isFractionalProduct(item) ? item.cartQuantity : item.cartQuantity.toFixed(0)}</p>
                                </div>
                                <div className="flex flex-col items-end gap-2 shrink-0">
                                    <div className="flex items-center gap-2">
                                        {isFractionalProduct(item) ? (
                                            <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md border border-primary/20">
                                                <span className="text-[10px] font-bold uppercase text-primary/70">Qty:</span>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={item.cartQuantity || ""}
                                                    onChange={(e) => updateQuantityDirect(item.id, e.target.value)}
                                                    className="h-6 w-14 border-none text-right text-xs font-bold focus-visible:ring-0 bg-transparent p-0"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex items-center border rounded-md h-7 overflow-hidden bg-background">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => updateQuantity(item.id, -1)}
                                                >
                                                    <Minus className="h-3 w-3" />
                                                </Button>
                                                <span className="w-8 text-center text-xs font-bold leading-none">{item.cartQuantity}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => updateQuantity(item.id, 1)}
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10 lg:opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => removeFromCart(item.id)}
                                    >
                                        <Trash2 className="h-3.3 w-3.3" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    const renderCartFooter = () => (
        <div className="w-full space-y-4">
            <div className="w-full space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold text-primary">
                    <span>Total</span>
                    <span>₹{total.toFixed(2)}</span>
                </div>
            </div>

            <div className="w-full space-y-3">
                <Select value={paymentMethod} onValueChange={(val: any) => setPaymentMethod(val)}>
                    <SelectTrigger className="w-full h-10 lg:h-11">
                        <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            <SelectValue placeholder="Payment Method" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="credit">Credit</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                </Select>

                <Button
                    className="w-full h-12 lg:h-13 text-lg font-bold"
                    disabled={cart.length === 0 || isProcessing}
                    onClick={handleCheckout}
                >
                    {isProcessing ? (
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                            Processing...
                        </div>
                    ) : (
                        "Complete Transaction"
                    )}
                </Button>
            </div>

            {cart.length > 0 && !selectedWarehouseId && (
                <div className="flex items-center gap-2 text-[10px] text-destructive animate-pulse font-medium">
                    <AlertCircle className="h-3 w-3" />
                    Please select a warehouse above to proceed
                </div>
            )}
        </div>
    );

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] lg:flex-row gap-4 lg:gap-6 p-3 lg:p-6 overflow-hidden relative">
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search products..."
                            className="pl-9 h-10 lg:h-11"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                        <SelectTrigger className="w-full sm:w-[200px] h-10 lg:h-11">
                            <SelectValue placeholder="Select Warehouse" />
                        </SelectTrigger>
                        <SelectContent>
                            {warehouses.map(w => (
                                <SelectItem key={w.id} value={w.id.toString()}>
                                    <div className="flex items-center gap-2">
                                        <Warehouse className="h-4 w-4" />
                                        {w.name}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 lg:pr-2 custom-scrollbar pb-24 lg:pb-0">
                    <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
                        {(() => {
                            const familyMap = new Map<number, ProductVariantResponse[]>();
                            for (const p of filteredProducts) {
                                const fid = p.family_id;
                                if (!familyMap.has(fid)) familyMap.set(fid, []);
                                familyMap.get(fid)!.push(p);
                            }

                            return Array.from(familyMap.entries()).map(([familyId, variants]) => {
                                const activeId = selectedVariant[familyId] ?? variants[0].id;
                                const activeVariant = variants.find(v => v.id === activeId) || variants[0];
                                const hasMultiple = variants.length > 1;
                                const stock = getVariantStock(activeVariant, variants);

                                return (
                                    <Card
                                        key={familyId}
                                        className="hover:border-primary transition-colors group flex flex-col active:scale-[0.98] lg:active:scale-100 shadow-sm"
                                    >
                                        <CardHeader className="p-3 lg:p-4 pb-1 lg:pb-2">
                                            <div className="flex justify-between items-start gap-1">
                                                <CardTitle className="text-[13px] lg:text-base leading-tight group-hover:text-primary transition-colors line-clamp-2">
                                                    {hasMultiple ? (activeVariant.family_name || activeVariant.name) : activeVariant.name}
                                                </CardTitle>
                                                <Badge variant="secondary" className="shrink-0 text-[10px] lg:text-xs">₹{activeVariant.selling_price}</Badge>
                                            </div>
                                            <CardDescription className="text-[10px] truncate opacity-60">SKU: {activeVariant.sku}</CardDescription>
                                        </CardHeader>

                                        <CardFooter className="p-3 lg:p-4 pt-0 flex-col items-stretch gap-2 mt-auto">
                                            {hasMultiple && (
                                                <div className="flex flex-wrap gap-1 border-t pt-2">
                                                    {variants.map(v => {
                                                        const vStock = getVariantStock(v, variants);
                                                        const isActive = v.id === activeVariant.id;
                                                        const isOOS = vStock <= 0;
                                                        const familyName = v.family_name || "";
                                                        let chipLabel = v.name;
                                                        if (familyName && v.name.startsWith(familyName)) {
                                                            chipLabel = v.name.slice(familyName.length).replace(/^\s*[-–—]\s*/, "").trim() || v.name;
                                                        }

                                                        return (
                                                            <button
                                                                key={v.id}
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (isOOS) {
                                                                        toast.error(`${chipLabel} is out of stock`);
                                                                        return;
                                                                    }
                                                                    setSelectedVariant(prev => ({ ...prev, [familyId]: v.id }));
                                                                }}
                                                                className={cn(
                                                                    "px-2 py-0.5 rounded-full text-[9px] lg:text-[11px] font-semibold border transition-all",
                                                                    isActive
                                                                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                                                        : isOOS
                                                                            ? "bg-muted/50 text-muted-foreground/40 border-transparent cursor-not-allowed line-through"
                                                                            : "bg-muted/60 text-foreground border-transparent hover:border-primary/40 cursor-pointer"
                                                                )}
                                                            >
                                                                {chipLabel}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            <div className="flex justify-between items-center text-[9px] lg:text-[10px] text-muted-foreground border-t pt-2">
                                                <div>Unit: {activeVariant.unit}</div>
                                                <div className={cn(
                                                    "font-bold flex items-center gap-1",
                                                    stock > 0 ? "text-green-600" : "text-destructive"
                                                )}>
                                                    <div className={cn("w-1.5 h-1.5 rounded-full", stock > 0 ? "bg-green-600" : "bg-destructive")} />
                                                    Stock: {stock}
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                className="w-full h-8 lg:h-9 gap-1 text-[11px] lg:text-xs cursor-pointer shadow-sm"
                                                disabled={stock <= 0}
                                                onClick={() => addToCart(activeVariant)}
                                            >
                                                <Plus className="h-3 w-3" /> Add
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                );
                            });
                        })()}
                    </div>
                    {filteredProducts.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
                            <Package className="h-10 lg:h-12 w-10 lg:w-12 mb-2 opacity-20" />
                            <p className="text-[12px] lg:text-sm px-4 text-center">No products found matching your search</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="lg:hidden fixed bottom-16 left-0 right-0 p-4 bg-background border-t shadow-[0_-4px_10px_rgba(0,0,0,0.05)] flex items-center justify-between z-10">
                <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Amount</span>
                    <span className="text-lg font-bold text-primary">₹{total.toFixed(2)}</span>
                </div>
                <Sheet>
                    <SheetTrigger asChild>
                        <Button className="gap-2 px-6 shadow-md shadow-primary/20">
                            <div className="relative">
                                <ShoppingCart className="h-4 w-4" />
                                {cart.length > 0 && (
                                    <Badge className="absolute -top-2.5 -right-2.5 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-destructive border-2 border-primary">
                                        {cart.length}
                                    </Badge>
                                )}
                            </div>
                            View Order
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col rounded-t-[20px] bg-muted/30">
                        <SheetHeader className="p-4 py-3 border-b bg-background rounded-t-[20px] shrink-0">
                            <SheetTitle className="flex items-center gap-2 text-base">
                                <ShoppingCart className="h-4 w-4 text-primary" />
                                Review Items ({cart.length})
                            </SheetTitle>
                        </SheetHeader>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {renderCartContent()}
                        </div>
                        <div className="p-4 bg-background border-t shrink-0">
                            {renderCartFooter()}
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            <Card className="hidden lg:flex w-full lg:w-[400px] flex-col shadow-xl border-none bg-muted/30 h-full">
                <CardHeader className="bg-background border-b rounded-t-lg shrink-0 py-4">
                    <div className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Checkout Order</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {renderCartContent()}
                </CardContent>
                <CardFooter className="flex-col bg-background border-t rounded-b-lg p-6 shrink-0 gap-4">
                    {renderCartFooter()}
                </CardFooter>
            </Card>
        </div>
    );
}
