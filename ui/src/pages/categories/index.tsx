import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { categoriesApi } from "@/api/categories";
import type { CategoryResponse } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CategoriesPage() {
    const [data, setData] = useState<CategoryResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [editing, setEditing] = useState<CategoryResponse | null>(null);
    const [deleting, setDeleting] = useState<CategoryResponse | null>(null);
    const [name, setName] = useState("");
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await categoriesApi.list();
            setData(res.data.data || []);
        } catch { toast.error("Failed to load categories"); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleSave = async () => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            if (editing) {
                await categoriesApi.update(editing.id, { name });
                toast.success("Category updated");
            } else {
                await categoriesApi.create({ name });
                toast.success("Category created");
            }
            setDialogOpen(false);
            load();
        } catch { toast.error("Failed to save category"); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleting) return;
        setSaving(true);
        try {
            await categoriesApi.delete(deleting.id);
            toast.success("Category deleted");
            setDeleteOpen(false);
            setDeleting(null);
            load();
        } catch { toast.error("Failed to delete category"); }
        finally { setSaving(false); }
    };

    const openCreate = () => { setEditing(null); setName(""); setDialogOpen(true); };
    const openEdit = (cat: CategoryResponse) => { setEditing(cat); setName(cat.name); setDialogOpen(true); };
    const openDelete = (cat: CategoryResponse) => { setDeleting(cat); setDeleteOpen(true); };

    const columns: Column<CategoryResponse>[] = [
        { header: "ID", accessorKey: "id", className: "w-20" },
        { header: "Name", accessorKey: "name" },
        {
            header: "Actions",
            className: "w-28 text-right",
            cell: (row) => (
                <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEdit(row); }}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); openDelete(row); }}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div>
            <PageHeader title="Categories" description="Manage product categories">
                <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Category</Button>
            </PageHeader>

            <DataTable columns={columns} data={data} loading={loading} />

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit Category" : "Create Category"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="cat-name">Name</Label>
                            <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving || !name.trim()}>
                            {saving ? "Saving..." : editing ? "Update" : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title="Delete Category"
                description={`Are you sure you want to delete "${deleting?.name}"? This action cannot be undone.`}
                onConfirm={handleDelete}
                loading={saving}
            />
        </div>
    );
}
