import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import { suppliersApi } from "@/api/suppliers";
import type { SupplierResponse } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SuppliersPage() {
    const navigate = useNavigate();
    const [data, setData] = useState<SupplierResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [editing, setEditing] = useState<SupplierResponse | null>(null);
    const [deleting, setDeleting] = useState<SupplierResponse | null>(null);
    const [form, setForm] = useState({ name: "", phone: "", location: "" });
    const [saving, setSaving] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await suppliersApi.list(page, 20);
            setData(res.data.data || []);
            setTotalPages(res.data.meta?.total_pages || 1);
        } catch { toast.error("Failed to load suppliers"); }
        finally { setLoading(false); }
    }, [page]);

    useEffect(() => { load(); }, [load]);

    const handleSave = async () => {
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            if (editing) {
                await suppliersApi.update(editing.id, form);
                toast.success("Supplier updated");
            } else {
                await suppliersApi.create(form);
                toast.success("Supplier created");
            }
            setDialogOpen(false);
            load();
        } catch { toast.error("Failed to save supplier"); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleting) return;
        setSaving(true);
        try {
            await suppliersApi.delete(deleting.id);
            toast.success("Supplier deleted");
            setDeleteOpen(false);
            setDeleting(null);
            load();
        } catch { toast.error("Failed to delete supplier"); }
        finally { setSaving(false); }
    };

    const openCreate = () => {
        setEditing(null);
        setForm({ name: "", phone: "", location: "" });
        setDialogOpen(true);
    };
    const openEdit = (s: SupplierResponse) => {
        setEditing(s);
        setForm({ name: s.name, phone: s.phone || "", location: s.location || "" });
        setDialogOpen(true);
    };

    const columns: Column<SupplierResponse>[] = [
        { header: "ID", accessorKey: "id", className: "w-20" },
        { header: "Name", accessorKey: "name" },
        { header: "Phone", accessorKey: "phone" },
        { header: "Location", accessorKey: "location" },
        {
            header: "Actions",
            className: "w-36 text-right",
            cell: (row) => (
                <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); navigate(`/suppliers/${row.id}`); }}>
                        <Eye className="h-4 w-4" />
                    </Button>
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
            <PageHeader title="Suppliers" description="Manage suppliers and their product variants">
                <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Supplier</Button>
            </PageHeader>

            <DataTable
                columns={columns}
                data={data}
                loading={loading}
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                onRowClick={(row) => navigate(`/suppliers/${row.id}`)}
                searchPlaceholder="Search suppliers..."
            />

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit Supplier" : "Create Supplier"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Supplier name" />
                        </div>
                        <div className="space-y-2">
                            <Label>Phone</Label>
                            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone number" />
                        </div>
                        <div className="space-y-2">
                            <Label>Location</Label>
                            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="City or address" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
                            {saving ? "Saving..." : editing ? "Update" : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title="Delete Supplier"
                description={`Are you sure you want to delete "${deleting?.name}"?`}
                onConfirm={handleDelete}
                loading={saving}
            />
        </div>
    );
}
