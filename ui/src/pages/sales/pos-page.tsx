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
import { Separator } from "@/components/ui/separator";
import { productsApi } from "@/api/products";
import { warehousesApi } from "@/api/warehouses";
import { salesApi } from "@/api/sales";
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
    const [customerName, setCustomerName] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "upi" | "credit" | "other">("cash");
    const [isProcessing, setIsProcessing] = useState(false);

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

    const addToCart = (product: ProductVariantResponse) => {
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

    const subtotal = cart.reduce((sum, item) => sum + (Number(item.selling_price) * item.cartQuantity), 0);
    const tax = subtotal * 0.18; // Example 18% tax
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

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] lg:flex-row gap-6 p-6 overflow-hidden">
            {/* Left side: Product Selection */}
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search products by name, SKU or barcode..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                        <SelectTrigger className="w-full sm:w-[200px]">
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

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredProducts.map((product) => (
                            <Card
                                key={product.id}
                                className="cursor-pointer hover:border-primary transition-colors group"
                                onClick={() => addToCart(product)}
                            >
                                <CardHeader className="p-4 pb-2">
                                    <div className="flex justify-between items-start gap-2">
                                        <CardTitle className="text-base leading-tight group-hover:text-primary transition-colors">
                                            {product.name}
                                        </CardTitle>
                                        <Badge variant="secondary">₹{product.selling_price}</Badge>
                                    </div>
                                    <CardDescription className="text-xs truncate">SKU: {product.sku}</CardDescription>
                                </CardHeader>
                                <CardFooter className="p-4 pt-0 justify-between items-center">
                                    <div className="text-[10px] text-muted-foreground">Unit: {product.unit}</div>
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full">
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                    {filteredProducts.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
                            <Package className="h-12 w-12 mb-2 opacity-20" />
                            <p>No products found matching your search</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Right side: Cart & Checkout */}
            <Card className="w-full lg:w-[400px] flex flex-col shadow-lg border-none bg-muted/30">
                <CardHeader className="bg-background border-b rounded-t-lg shrink-0">
                    <div className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Checkout Order</CardTitle>
                    </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium flex items-center gap-1">
                                <User className="h-3 w-3" /> Customer Information
                            </label>
                            <Input
                                placeholder="Customer Name (Optional)"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                className="bg-background"
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
                                                <p className="text-xs text-muted-foreground">₹{item.selling_price} × {item.cartQuantity}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-2 shrink-0">
                                                <div className="flex items-center border rounded-md h-7">
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
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
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
                </CardContent>

                <CardFooter className="flex-col bg-background border-t rounded-b-lg p-6 shrink-0 gap-4">
                    <div className="w-full space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>₹{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Tax (18%)</span>
                            <span>₹{tax.toFixed(2)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between text-lg font-bold text-primary">
                            <span>Total</span>
                            <span>₹{total.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="w-full space-y-3">
                        <Select value={paymentMethod} onValueChange={(val: any) => setPaymentMethod(val)}>
                            <SelectTrigger className="w-full h-10">
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
                            className="w-full h-12 text-lg font-bold"
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
                </CardFooter>
            </Card>
        </div>
    );
}
