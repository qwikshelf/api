import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { productsApi } from "@/api/products";
import { productFamiliesApi } from "@/api/product-families";
import type { ProductVariantResponse, ProductFamilyResponse } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const UNITS = ["piece", "kg", "liter", "box", "pack", "dozen"];

export default function ProductsPage() {
    const [data, setData] = useState<ProductVariantResponse[]>([]);
    const [families, setFamilies] = useState<ProductFamilyResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [editing, setEditing] = useState<ProductVariantResponse | null>(null);
    const [deleting, setDeleting] = useState<ProductVariantResponse | null>(null);
    const [form, setForm] = useState({
        family_id: 0, name: "", sku: "", barcode: "", unit: "piece",
        cost_price: "", selling_price: "", is_manufactured: false,
    });
    const [saving, setSaving] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await productsApi.list(page, 20);
            setData(res.data.data || []);
            setTotalPages(res.data.meta?.total_pages || 1);
        } catch { toast.error("Failed to load products"); }
        finally { setLoading(false); }
    }, [page]);

    const loadFamilies = useCallback(async () => {
        try {
            const res = await productFamiliesApi.list(1, 100);
            setFamilies(res.data.data || []);
        } catch { /* silent */ }
    }, []);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { loadFamilies(); }, [loadFamilies]);

    const handleSave = async () => {
        if (!form.name.trim() || !form.sku.trim() || !form.family_id) return;
        setSaving(true);
        try {
            if (editing) {
                await productsApi.update(editing.id, form);
                toast.success("Product updated");
            } else {
                await productsApi.create(form);
                toast.success("Product created");
            }
            setDialogOpen(false);
            load();
        } catch { toast.error("Failed to save product"); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleting) return;
        setSaving(true);
        try {
            await productsApi.delete(deleting.id);
            toast.success("Product deleted");
            setDeleteOpen(false);
            setDeleting(null);
            load();
        } catch { toast.error("Failed to delete product"); }
        finally { setSaving(false); }
    };

    const openCreate = () => {
        setEditing(null);
        setForm({ family_id: families[0]?.id || 0, name: "", sku: "", barcode: "", unit: "piece", cost_price: "", selling_price: "", is_manufactured: false });
        setDialogOpen(true);
    };
    const openEdit = (p: ProductVariantResponse) => {
        setEditing(p);
        setForm({
            family_id: p.family_id, name: p.name, sku: p.sku, barcode: p.barcode || "",
            unit: p.unit, cost_price: p.cost_price, selling_price: p.selling_price, is_manufactured: p.is_manufactured,
        });
        setDialogOpen(true);
    };

    const columns: Column<ProductVariantResponse>[] = [
        { header: "SKU", cell: (row) => <span className="font-mono text-sm">{row.sku}</span>, className: "w-32" },
        { header: "Name", accessorKey: "name" },
        { header: "Family", cell: (row) => <Badge variant="secondary">{row.family_name || `#${row.family_id}`}</Badge> },
        { header: "Unit", cell: (row) => <Badge variant="outline">{row.unit}</Badge>, className: "w-24" },
        { header: "Cost", cell: (row) => `₹${row.cost_price}`, className: "w-24 text-right" },
        { header: "Selling", cell: (row) => `₹${row.selling_price}`, className: "w-24 text-right" },
        {
            header: "Mfg",
            className: "w-16",
            cell: (row) => row.is_manufactured ? <Badge>Yes</Badge> : <span className="text-muted-foreground">No</span>,
        },
        {
            header: "Actions",
            className: "w-28 text-right",
            cell: (row) => (
                <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEdit(row); }}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleting(row); setDeleteOpen(true); }}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div>
            <PageHeader title="Products" description="Manage product variants (SKUs)">
                <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Product</Button>
            </PageHeader>

            <DataTable columns={columns} data={data} loading={loading} page={page} totalPages={totalPages} onPageChange={setPage} />

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit Product" : "Create Product"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Name</Label>
                                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Product name" />
                            </div>
                            <div className="space-y-2">
                                <Label>SKU</Label>
                                <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="SKU code" className="font-mono" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Family</Label>
                                <Select value={String(form.family_id)} onValueChange={(v) => setForm({ ...form, family_id: Number(v) })}>
                                    <SelectTrigger><SelectValue placeholder="Select family" /></SelectTrigger>
                                    <SelectContent>
                                        {families.map((f) => (
                                            <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Unit</Label>
                                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {UNITS.map((u) => (
                                            <SelectItem key={u} value={u}>{u}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Barcode</Label>
                            <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="Optional barcode" className="font-mono" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Cost Price (₹)</Label>
                                <Input type="number" step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} placeholder="0.00" />
                            </div>
                            <div className="space-y-2">
                                <Label>Selling Price (₹)</Label>
                                <Input type="number" step="0.01" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} placeholder="0.00" />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Switch checked={form.is_manufactured} onCheckedChange={(v) => setForm({ ...form, is_manufactured: v })} />
                            <Label>Manufactured in-house</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving || !form.name.trim() || !form.sku.trim()}>
                            {saving ? "Saving..." : editing ? "Update" : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title="Delete Product"
                description={`Are you sure you want to delete "${deleting?.name}" (${deleting?.sku})?`}
                onConfirm={handleDelete}
                loading={saving}
            />
        </div>
    );
}
