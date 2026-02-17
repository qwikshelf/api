import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { productFamiliesApi } from "@/api/product-families";
import { categoriesApi } from "@/api/categories";
import type { ProductFamilyResponse, CategoryResponse } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function ProductFamiliesPage() {
    const [data, setData] = useState<ProductFamilyResponse[]>([]);
    const [categories, setCategories] = useState<CategoryResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [editing, setEditing] = useState<ProductFamilyResponse | null>(null);
    const [deleting, setDeleting] = useState<ProductFamilyResponse | null>(null);
    const [form, setForm] = useState({ name: "", category_id: 0, description: "" });
    const [saving, setSaving] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await productFamiliesApi.list(page, 20);
            setData(res.data.data || []);
            setTotalPages(res.data.meta?.total_pages || 1);
        } catch { toast.error("Failed to load product families"); }
        finally { setLoading(false); }
    }, [page]);

    const loadCategories = useCallback(async () => {
        try {
            const res = await categoriesApi.list();
            setCategories(res.data.data || []);
        } catch { /* silent */ }
    }, []);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { loadCategories(); }, [loadCategories]);

    const handleSave = async () => {
        if (!form.name.trim() || !form.category_id) return;
        setSaving(true);
        try {
            if (editing) {
                await productFamiliesApi.update(editing.id, form);
                toast.success("Product family updated");
            } else {
                await productFamiliesApi.create(form);
                toast.success("Product family created");
            }
            setDialogOpen(false);
            load();
        } catch { toast.error("Failed to save product family"); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleting) return;
        setSaving(true);
        try {
            await productFamiliesApi.delete(deleting.id);
            toast.success("Product family deleted");
            setDeleteOpen(false);
            setDeleting(null);
            load();
        } catch { toast.error("Failed to delete product family"); }
        finally { setSaving(false); }
    };

    const openCreate = () => {
        setEditing(null);
        setForm({ name: "", category_id: categories[0]?.id || 0, description: "" });
        setDialogOpen(true);
    };
    const openEdit = (f: ProductFamilyResponse) => {
        setEditing(f);
        setForm({ name: f.name, category_id: f.category_id, description: f.description || "" });
        setDialogOpen(true);
    };

    const columns: Column<ProductFamilyResponse>[] = [
        { header: "ID", accessorKey: "id", className: "w-20" },
        { header: "Name", accessorKey: "name" },
        {
            header: "Category",
            cell: (row) => <Badge variant="secondary">{row.category?.name || `#${row.category_id}`}</Badge>,
        },
        { header: "Description", accessorKey: "description" },
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
            <PageHeader title="Product Families" description="Group product variants into families">
                <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Family</Button>
            </PageHeader>

            <DataTable columns={columns} data={data} loading={loading} page={page} totalPages={totalPages} onPageChange={setPage} />

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit Product Family" : "Create Product Family"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Family name" />
                        </div>
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select value={String(form.category_id)} onValueChange={(v) => setForm({ ...form, category_id: Number(v) })}>
                                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                                <SelectContent>
                                    {categories.map((c) => (
                                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving || !form.name.trim() || !form.category_id}>
                            {saving ? "Saving..." : editing ? "Update" : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title="Delete Product Family"
                description={`Are you sure you want to delete "${deleting?.name}"?`}
                onConfirm={handleDelete}
                loading={saving}
            />
        </div>
    );
}
