import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, ShoppingCart } from "lucide-react";
import { procurementsApi } from "@/api/procurements";
import { suppliersApi } from "@/api/suppliers";
import { warehousesApi } from "@/api/warehouses";
import { productsApi } from "@/api/products";
import type { SupplierResponse, WarehouseResponse, ProductVariantResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface POItem {
    variant_id: number;
    variant_name: string;
    variant_sku: string;
    quantity: string;
    unit_cost: string;
}

export default function CreateProcurementPage() {
    const navigate = useNavigate();
    const [suppliers, setSuppliers] = useState<SupplierResponse[]>([]);
    const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
    const [products, setProducts] = useState<ProductVariantResponse[]>([]);
    const [supplierId, setSupplierId] = useState<number>(0);
    const [warehouseId, setWarehouseId] = useState<number>(0);
    const [expectedDelivery, setExpectedDelivery] = useState("");
    const [items, setItems] = useState<POItem[]>([{ variant_id: 0, variant_name: "", variant_sku: "", quantity: "", unit_cost: "" }]);
    const [saving, setSaving] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [supRes, whRes, prodRes] = await Promise.all([
                suppliersApi.list(1, 200),
                warehousesApi.list(),
                productsApi.list(1, 200),
            ]);
            setSuppliers(supRes.data.data || []);
            setWarehouses(whRes.data.data || []);
            setProducts(prodRes.data.data || []);
        } catch { toast.error("Failed to load form data"); }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const addItem = () => {
        setItems([...items, { variant_id: 0, variant_name: "", variant_sku: "", quantity: "", unit_cost: "" }]);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: keyof POItem, value: string) => {
        const updated = [...items];
        if (field === "variant_id") {
            const id = Number(value);
            const product = products.find((p) => p.id === id);
            updated[index] = {
                ...updated[index],
                variant_id: id,
                variant_name: product?.name || "",
                variant_sku: product?.sku || "",
                unit_cost: product?.cost_price || updated[index].unit_cost,
            };
        } else {
            (updated[index] as unknown as Record<string, string>)[field] = value;
        }
        setItems(updated);
    };

    const lineTotal = (item: POItem) => {
        const qty = parseFloat(item.quantity) || 0;
        const cost = parseFloat(item.unit_cost) || 0;
        return (qty * cost).toFixed(2);
    };

    const grandTotal = items.reduce((sum, item) => sum + (parseFloat(lineTotal(item)) || 0), 0).toFixed(2);

    const validItems = items.filter((i) => i.variant_id && i.quantity && i.unit_cost);

    const handleSubmit = async () => {
        if (!supplierId || !warehouseId || !validItems.length) {
            toast.error("Fill in supplier, warehouse, and at least one item");
            return;
        }
        setSaving(true);
        try {
            const res = await procurementsApi.create({
                supplier_id: supplierId,
                warehouse_id: warehouseId,
                expected_delivery: expectedDelivery || undefined,
                items: validItems.map((i) => ({
                    variant_id: i.variant_id,
                    quantity: i.quantity,
                    unit_cost: i.unit_cost,
                })),
            });
            toast.success("Purchase order created");
            navigate(`/procurements/${res.data.data.id}`);
        } catch { toast.error("Failed to create purchase order"); }
        finally { setSaving(false); }
    };

    return (
        <div className="max-w-4xl">
            <Button variant="ghost" size="sm" onClick={() => navigate("/procurements")} className="mb-4 -ml-2">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Procurements
            </Button>

            <div className="flex items-center gap-3 mb-6">
                <ShoppingCart className="h-7 w-7 text-primary" />
                <div>
                    <h1 className="text-2xl font-bold">New Purchase Order</h1>
                    <p className="text-muted-foreground text-sm">Create a purchase order for your supplier</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Order Details */}
                <Card>
                    <CardHeader><CardTitle className="text-lg">Order Details</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Supplier</Label>
                            <Select value={supplierId ? String(supplierId) : ""} onValueChange={(v) => setSupplierId(Number(v))}>
                                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                                <SelectContent>
                                    {suppliers.map((s) => (
                                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Destination Warehouse</Label>
                            <Select value={warehouseId ? String(warehouseId) : ""} onValueChange={(v) => setWarehouseId(Number(v))}>
                                <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                                <SelectContent>
                                    {warehouses.map((w) => (
                                        <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Expected Delivery</Label>
                            <Input type="date" value={expectedDelivery} onChange={(e) => setExpectedDelivery(e.target.value)} />
                        </div>
                    </CardContent>
                </Card>

                {/* Line Items */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Line Items</CardTitle>
                            <Button variant="outline" size="sm" onClick={addItem}>
                                <Plus className="mr-1 h-3 w-3" /> Add Item
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {/* Header labels */}
                            <div className="grid grid-cols-[1fr_100px_120px_100px_40px] gap-3 text-xs font-medium text-muted-foreground px-1">
                                <span>Product</span>
                                <span>Quantity</span>
                                <span>Unit Cost (₹)</span>
                                <span className="text-right">Line Total</span>
                                <span></span>
                            </div>

                            {items.map((item, idx) => (
                                <div key={idx} className="grid grid-cols-[1fr_100px_120px_100px_40px] gap-3 items-center">
                                    <Select value={item.variant_id ? String(item.variant_id) : ""} onValueChange={(v) => updateItem(idx, "variant_id", v)}>
                                        <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                                        <SelectContent>
                                            {products.map((p) => (
                                                <SelectItem key={p.id} value={String(p.id)}>
                                                    {p.name} <span className="text-muted-foreground">({p.sku})</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={item.quantity}
                                        onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                                        placeholder="Qty"
                                    />
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={item.unit_cost}
                                        onChange={(e) => updateItem(idx, "unit_cost", e.target.value)}
                                        placeholder="0.00"
                                    />
                                    <p className="text-right font-mono text-sm font-medium">
                                        ₹{lineTotal(item)}
                                    </p>
                                    {items.length > 1 && (
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(idx)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Grand Total */}
                        <div className="mt-6 pt-4 border-t flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline">{validItems.length} item{validItems.length !== 1 ? "s" : ""}</Badge>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-muted-foreground">Grand Total</p>
                                <p className="text-2xl font-bold font-mono">₹{grandTotal}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Submit */}
                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => navigate("/procurements")}>Cancel</Button>
                    <Button size="lg" onClick={handleSubmit} disabled={saving || !supplierId || !warehouseId || !validItems.length}>
                        {saving ? "Creating..." : "Create Purchase Order"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
