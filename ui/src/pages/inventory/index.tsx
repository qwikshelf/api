import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { ArrowRightLeft, PlusCircle } from "lucide-react";
import { inventoryApi } from "@/api/inventory";
import { warehousesApi } from "@/api/warehouses";
import { productsApi } from "@/api/products";
import type { InventoryLevelResponse, WarehouseResponse, ProductVariantResponse } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Trash2, Plus } from "lucide-react";

export default function InventoryPage() {
    const [data, setData] = useState<InventoryLevelResponse[]>([]);
    const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
    const [products, setProducts] = useState<ProductVariantResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Adjust dialog
    const [adjustOpen, setAdjustOpen] = useState(false);
    const [adjustForm, setAdjustForm] = useState({ warehouse_id: 0, variant_id: 0, quantity_delta: "", reason: "" });
    const [adjustSaving, setAdjustSaving] = useState(false);

    // Transfer dialog
    const [transferOpen, setTransferOpen] = useState(false);
    const [transferForm, setTransferForm] = useState({
        source_warehouse_id: 0,
        destination_warehouse_id: 0,
        items: [{ variant_id: 0, quantity: "" }] as { variant_id: number; quantity: string }[],
    });
    const [transferSaving, setTransferSaving] = useState(false);

    const loadWarehouses = useCallback(async () => {
        try {
            const res = await warehousesApi.list();
            setWarehouses(res.data.data || []);
        } catch { /* silent */ }
    }, []);

    const loadProducts = useCallback(async () => {
        try {
            const res = await productsApi.list(1, 200);
            setProducts(res.data.data || []);
        } catch { /* silent */ }
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            if (selectedWarehouse !== "all") {
                const res = await inventoryApi.listByWarehouse(Number(selectedWarehouse));
                setData(res.data.data || []);
                setTotalPages(1);
            } else {
                const res = await inventoryApi.list(page, 20);
                setData(res.data.data || []);
                setTotalPages(res.data.meta?.total_pages || 1);
            }
        } catch { toast.error("Failed to load inventory"); }
        finally { setLoading(false); }
    }, [selectedWarehouse, page]);

    useEffect(() => { loadWarehouses(); loadProducts(); }, [loadWarehouses, loadProducts]);
    useEffect(() => { setPage(1); }, [selectedWarehouse]);
    useEffect(() => { load(); }, [load]);

    // --- Adjust Stock ---
    const handleAdjust = async () => {
        if (!adjustForm.warehouse_id || !adjustForm.variant_id || !adjustForm.quantity_delta) return;
        setAdjustSaving(true);
        try {
            await inventoryApi.adjust(adjustForm);
            toast.success("Stock adjusted");
            setAdjustOpen(false);
            load();
        } catch { toast.error("Failed to adjust stock"); }
        finally { setAdjustSaving(false); }
    };

    const openAdjust = () => {
        setAdjustForm({
            warehouse_id: warehouses[0]?.id || 0,
            variant_id: 0,
            quantity_delta: "",
            reason: "",
        });
        setAdjustOpen(true);
    };

    // --- Transfer ---
    const addTransferItem = () => {
        setTransferForm({
            ...transferForm,
            items: [...transferForm.items, { variant_id: 0, quantity: "" }],
        });
    };

    const removeTransferItem = (index: number) => {
        setTransferForm({
            ...transferForm,
            items: transferForm.items.filter((_, i) => i !== index),
        });
    };

    const updateTransferItem = (index: number, field: "variant_id" | "quantity", value: string) => {
        const items = [...transferForm.items];
        if (field === "variant_id") items[index].variant_id = Number(value);
        else items[index].quantity = value;
        setTransferForm({ ...transferForm, items });
    };

    const handleTransfer = async () => {
        const { source_warehouse_id, destination_warehouse_id, items } = transferForm;
        if (!source_warehouse_id || !destination_warehouse_id || source_warehouse_id === destination_warehouse_id) {
            toast.error("Source and destination must be different"); return;
        }
        const validItems = items.filter((i) => i.variant_id && i.quantity);
        if (!validItems.length) { toast.error("Add at least one item"); return; }
        setTransferSaving(true);
        try {
            await inventoryApi.transfer({ source_warehouse_id, destination_warehouse_id, items: validItems });
            toast.success("Transfer completed");
            setTransferOpen(false);
            load();
        } catch { toast.error("Failed to transfer stock"); }
        finally { setTransferSaving(false); }
    };

    const openTransfer = () => {
        setTransferForm({
            source_warehouse_id: warehouses[0]?.id || 0,
            destination_warehouse_id: warehouses[1]?.id || 0,
            items: [{ variant_id: 0, quantity: "" }],
        });
        setTransferOpen(true);
    };

    const columns: Column<InventoryLevelResponse>[] = [
        {
            header: "Product",
            cell: (row) => (
                <div>
                    <p className="font-medium">{row.variant?.name || `Variant #${row.variant_id}`}</p>
                    <p className="text-xs text-muted-foreground font-mono">{row.variant?.sku}</p>
                </div>
            ),
        },
        {
            header: "Warehouse",
            cell: (row) => <Badge variant="secondary">{row.warehouse?.name || `#${row.warehouse_id}`}</Badge>,
        },
        {
            header: "Quantity",
            className: "w-28 text-right",
            cell: (row) => {
                const qty = parseFloat(row.quantity);
                return (
                    <span className={qty <= 0 ? "text-destructive font-semibold" : qty < 10 ? "text-amber-600 font-medium" : ""}>
                        {row.quantity} {row.variant?.unit || ""}
                    </span>
                );
            },
        },
        {
            header: "Batch",
            className: "w-24",
            cell: (row) => row.batch_number ? <span className="font-mono text-sm">#{row.batch_number}</span> : <span className="text-muted-foreground">—</span>,
        },
        {
            header: "Expiry",
            className: "w-28",
            cell: (row) => {
                if (!row.expiry_date) return <span className="text-muted-foreground">—</span>;
                const d = new Date(row.expiry_date);
                const isExpired = d < new Date();
                return <span className={isExpired ? "text-destructive" : ""}>{d.toLocaleDateString()}</span>;
            },
        },
    ];

    return (
        <div>
            <PageHeader title="Inventory" description="Track stock levels across warehouses">
                <Button variant="outline" onClick={openAdjust}><PlusCircle className="mr-2 h-4 w-4" />Adjust Stock</Button>
                <Button onClick={openTransfer}><ArrowRightLeft className="mr-2 h-4 w-4" />Transfer</Button>
            </PageHeader>

            <div className="mb-4">
                <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                    <SelectTrigger className="w-64">
                        <SelectValue placeholder="Filter by warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Warehouses</SelectItem>
                        {warehouses.map((w) => (
                            <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <DataTable
                columns={columns}
                data={data}
                loading={loading}
                page={selectedWarehouse === "all" ? page : undefined}
                totalPages={selectedWarehouse === "all" ? totalPages : undefined}
                onPageChange={selectedWarehouse === "all" ? setPage : undefined}
                searchPlaceholder="Search inventory..."
            />

            {/* Adjust Stock Dialog */}
            <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Adjust Stock</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Warehouse</Label>
                            <Select value={String(adjustForm.warehouse_id)} onValueChange={(v) => setAdjustForm({ ...adjustForm, warehouse_id: Number(v) })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {warehouses.map((w) => (
                                        <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Product</Label>
                            <Select value={adjustForm.variant_id ? String(adjustForm.variant_id) : ""} onValueChange={(v) => setAdjustForm({ ...adjustForm, variant_id: Number(v) })}>
                                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                                <SelectContent>
                                    {products.map((p) => (
                                        <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.sku})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Quantity Delta</Label>
                            <Input type="number" value={adjustForm.quantity_delta} onChange={(e) => setAdjustForm({ ...adjustForm, quantity_delta: e.target.value })} placeholder="Positive to add, negative to subtract" />
                            <p className="text-xs text-muted-foreground">Use negative values to reduce stock</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Reason</Label>
                            <Textarea value={adjustForm.reason} onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })} placeholder="Reason for adjustment" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAdjustOpen(false)}>Cancel</Button>
                        <Button onClick={handleAdjust} disabled={adjustSaving || !adjustForm.variant_id || !adjustForm.quantity_delta}>
                            {adjustSaving ? "Adjusting..." : "Adjust Stock"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Transfer Dialog */}
            <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Transfer Stock</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Source Warehouse</Label>
                                <Select value={String(transferForm.source_warehouse_id)} onValueChange={(v) => setTransferForm({ ...transferForm, source_warehouse_id: Number(v) })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {warehouses.map((w) => (
                                            <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Destination Warehouse</Label>
                                <Select value={String(transferForm.destination_warehouse_id)} onValueChange={(v) => setTransferForm({ ...transferForm, destination_warehouse_id: Number(v) })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {warehouses.filter((w) => w.id !== transferForm.source_warehouse_id).map((w) => (
                                            <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Items</Label>
                                <Button type="button" variant="outline" size="sm" onClick={addTransferItem}>
                                    <Plus className="mr-1 h-3 w-3" />Add Item
                                </Button>
                            </div>
                            <div className="space-y-3 rounded-lg border p-3 max-h-64 overflow-y-auto">
                                {transferForm.items.map((item, idx) => (
                                    <div key={idx} className="flex items-end gap-3">
                                        <div className="flex-1 space-y-1">
                                            {idx === 0 && <Label className="text-xs text-muted-foreground">Product</Label>}
                                            <Select value={item.variant_id ? String(item.variant_id) : ""} onValueChange={(v) => updateTransferItem(idx, "variant_id", v)}>
                                                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                                                <SelectContent>
                                                    {products.map((p) => (
                                                        <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.sku})</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="w-28 space-y-1">
                                            {idx === 0 && <Label className="text-xs text-muted-foreground">Quantity</Label>}
                                            <Input type="number" step="0.01" value={item.quantity} onChange={(e) => updateTransferItem(idx, "quantity", e.target.value)} placeholder="Qty" />
                                        </div>
                                        {transferForm.items.length > 1 && (
                                            <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive shrink-0" onClick={() => removeTransferItem(idx)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTransferOpen(false)}>Cancel</Button>
                        <Button onClick={handleTransfer} disabled={transferSaving}>
                            {transferSaving ? "Transferring..." : "Transfer Stock"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
