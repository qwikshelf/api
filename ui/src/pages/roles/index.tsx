import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check } from "lucide-react";
import { rolesApi, permissionsApi } from "@/api/roles";
import type { RoleResponse, PermissionResponse } from "@/types";
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
import { cn } from "@/lib/utils";

export default function RolesPage() {
    const [data, setData] = useState<RoleResponse[]>([]);
    const [allPermissions, setAllPermissions] = useState<PermissionResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [editing, setEditing] = useState<RoleResponse | null>(null);
    const [deleting, setDeleting] = useState<RoleResponse | null>(null);
    const [form, setForm] = useState({ name: "", description: "" });
    const [selectedPermIds, setSelectedPermIds] = useState<number[]>([]);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await rolesApi.list();
            setData(res.data.data || []);
        } catch { toast.error("Failed to load roles"); }
        finally { setLoading(false); }
    }, []);

    const loadPermissions = useCallback(async () => {
        try {
            const res = await permissionsApi.list();
            console.log(res.data.data);
            setAllPermissions(res.data.data || []);
        } catch { /* silent */ }
    }, []);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { loadPermissions(); }, [loadPermissions]);

    const handleSave = async () => {
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            const payload = { ...form, permission_ids: selectedPermIds };
            if (editing) {
                await rolesApi.update(editing.id, payload);
                toast.success("Role updated");
            } else {
                await rolesApi.create(payload);
                toast.success("Role created");
            }
            setDialogOpen(false);
            load();
        } catch { toast.error("Failed to save role"); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleting) return;
        setSaving(true);
        try {
            await rolesApi.delete(deleting.id);
            toast.success("Role deleted");
            setDeleteOpen(false);
            setDeleting(null);
            load();
        } catch { toast.error("Failed to delete role"); }
        finally { setSaving(false); }
    };

    const togglePermission = (id: number) => {
        setSelectedPermIds((prev) =>
            prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
        );
    };

    const openCreate = () => {
        setEditing(null);
        setForm({ name: "", description: "" });
        setSelectedPermIds([]);
        setDialogOpen(true);
    };

    const openEdit = (r: RoleResponse) => {
        setEditing(r);
        setForm({ name: r.name, description: r.description || "" });
        setSelectedPermIds(r.permissions?.map((p) => p.id) || []);
        setDialogOpen(true);
    };

    const columns: Column<RoleResponse>[] = [
        { header: "ID", accessorKey: "id", className: "w-20" },
        { header: "Name", accessorKey: "name" },
        { header: "Description", accessorKey: "description" },
        {
            header: "Permissions",
            cell: (row) => (
                <div className="flex flex-wrap gap-1">
                    {(row.permissions || []).slice(0, 3).map((p) => (
                        <Badge key={p.id} variant="secondary" className="text-xs">{p.slug}</Badge>
                    ))}
                    {(row.permissions?.length || 0) > 3 && (
                        <Badge variant="outline" className="text-xs">+{row.permissions!.length - 3}</Badge>
                    )}
                    {!row.permissions?.length && <span className="text-muted-foreground text-sm">None</span>}
                </div>
            ),
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
            <PageHeader title="Roles" description="Manage user roles and permissions">
                <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Role</Button>
            </PageHeader>

            <DataTable columns={columns} data={data} loading={loading} searchPlaceholder="Search roles..." />

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit Role" : "Create Role"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Role name" />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
                        </div>
                        <div className="space-y-2">
                            <Label>Permissions</Label>
                            {allPermissions.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No permissions available</p>
                            ) : (
                                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-lg border p-3">
                                    {allPermissions.map((perm) => {
                                        const isSelected = selectedPermIds.includes(perm.id);
                                        return (
                                            <button
                                                key={perm.id}
                                                type="button"
                                                onClick={() => togglePermission(perm.id)}
                                                className={cn(
                                                    "flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                                                    isSelected
                                                        ? "bg-primary/10 text-primary border border-primary/30"
                                                        : "hover:bg-muted border border-transparent"
                                                )}
                                            >
                                                <div className={cn(
                                                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                                                    isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"
                                                )}>
                                                    {isSelected && <Check className="h-3 w-3" />}
                                                </div>
                                                <span className="truncate">{perm.slug}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            {selectedPermIds.length > 0 && (
                                <p className="text-xs text-muted-foreground">{selectedPermIds.length} permission{selectedPermIds.length !== 1 ? "s" : ""} selected</p>
                            )}
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
                title="Delete Role"
                description={`Are you sure you want to delete the "${deleting?.name}" role?`}
                onConfirm={handleDelete}
                loading={saving}
            />
        </div>
    );
}
