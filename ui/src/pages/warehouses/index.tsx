import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { warehousesApi } from "@/api/warehouses";
import type { WarehouseResponse, WarehouseType } from "@/types";
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

const WAREHOUSE_TYPES: { value: WarehouseType; label: string }[] = [
    { value: "store", label: "Store" },
    { value: "factory", label: "Factory" },
    { value: "distribution_center", label: "Distribution Center" },
];

const typeBadgeVariant = (t: string) => {
    switch (t) {
        case "factory": return "default" as const;
        case "distribution_center": return "secondary" as const;
        default: return "outline" as const;
    }
};

export default function WarehousesPage() {
    const [data, setData] = useState<WarehouseResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [editing, setEditing] = useState<WarehouseResponse | null>(null);
    const [deleting, setDeleting] = useState<WarehouseResponse | null>(null);
    const [form, setForm] = useState({ name: "", type: "store" as WarehouseType, address: "" });
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await warehousesApi.list();
            setData(res.data.data || []);
        } catch { toast.error("Failed to load warehouses"); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleSave = async () => {
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            if (editing) {
                await warehousesApi.update(editing.id, form);
                toast.success("Warehouse updated");
            } else {
                await warehousesApi.create(form);
                toast.success("Warehouse created");
            }
            setDialogOpen(false);
            load();
        } catch { toast.error("Failed to save warehouse"); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleting) return;
        setSaving(true);
        try {
            await warehousesApi.delete(deleting.id);
            toast.success("Warehouse deleted");
            setDeleteOpen(false);
            setDeleting(null);
            load();
        } catch { toast.error("Failed to delete warehouse"); }
        finally { setSaving(false); }
    };

    const openCreate = () => {
        setEditing(null);
        setForm({ name: "", type: "store", address: "" });
        setDialogOpen(true);
    };
    const openEdit = (w: WarehouseResponse) => {
        setEditing(w);
        setForm({ name: w.name, type: w.type, address: w.address || "" });
        setDialogOpen(true);
    };

    const columns: Column<WarehouseResponse>[] = [
        { header: "ID", accessorKey: "id", className: "w-20" },
        { header: "Name", accessorKey: "name" },
        {
            header: "Type",
            cell: (row) => (
                <Badge variant={typeBadgeVariant(row.type)}>
                    {row.type.replace("_", " ")}
                </Badge>
            ),
        },
        { header: "Address", accessorKey: "address" },
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
            <PageHeader title="Warehouses" description="Manage warehouse locations">
                <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Warehouse</Button>
            </PageHeader>

            <DataTable columns={columns} data={data} loading={loading} />

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit Warehouse" : "Create Warehouse"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Warehouse name" />
                        </div>
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as WarehouseType })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {WAREHOUSE_TYPES.map((t) => (
                                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Address</Label>
                            <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Optional address" />
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
                title="Delete Warehouse"
                description={`Are you sure you want to delete "${deleting?.name}"?`}
                onConfirm={handleDelete}
                loading={saving}
            />
        </div>
    );
}
