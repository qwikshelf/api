import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check } from "lucide-react";
import { usersApi } from "@/api/users";
import { rolesApi, permissionsApi } from "@/api/roles";
import type { UserResponse, RoleResponse, PermissionResponse } from "@/types";
import { cn } from "@/lib/utils";
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
import { Switch } from "@/components/ui/switch";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function UsersPage() {
    const [data, setData] = useState<UserResponse[]>([]);
    const [roles, setRoles] = useState<RoleResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [editing, setEditing] = useState<UserResponse | null>(null);
    const [deleting, setDeleting] = useState<UserResponse | null>(null);
    const [form, setForm] = useState({ username: "", password: "", role_id: 0, is_active: true });
    const [saving, setSaving] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Permissions state
    const [allPermissions, setAllPermissions] = useState<PermissionResponse[]>([]);
    const [inheritedPermIds, setInheritedPermIds] = useState<Set<number>>(new Set());
    const [selectedDirectPermIds, setSelectedDirectPermIds] = useState<number[]>([]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await usersApi.list(page, 20);
            setData(res.data.data || []);
            setTotalPages(res.data.meta?.total_pages || 1);
        } catch { toast.error("Failed to load users"); }
        finally { setLoading(false); }
    }, [page]);

    const loadRoles = useCallback(async () => {
        try {
            const res = await rolesApi.list();
            setRoles(res.data.data || []);
        } catch { /* silent */ }
    }, []);

    const loadPermissions = useCallback(async () => {
        try {
            const res = await permissionsApi.list();
            setAllPermissions(res.data.data || []);
        } catch { /* silent */ }
    }, []);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { loadRoles(); }, [loadRoles]);
    useEffect(() => { loadPermissions(); }, [loadPermissions]);

    useEffect(() => {
        if (!form.role_id) {
            setInheritedPermIds(new Set());
            return;
        }
        rolesApi.get(form.role_id).then(res => {
            const rolePerms = res.data.data.permissions || [];
            const ids = new Set(rolePerms.map(p => p.id));
            setInheritedPermIds(ids);

            // Re-calculate direct overrides if we just loaded the initial role of the editing user
            if (editing && editing.role_id === form.role_id) {
                const directIds = (editing.permissions || [])
                    .map(p => p.id)
                    .filter(id => !ids.has(id));
                setSelectedDirectPermIds(directIds);
            }
        }).catch(() => setInheritedPermIds(new Set()));
    }, [form.role_id, editing]);

    const handleSave = async () => {
        if (!form.username.trim() || !form.role_id) return;
        setSaving(true);
        try {
            if (editing) {
                await usersApi.update(editing.id, {
                    username: form.username,
                    role_id: form.role_id,
                    is_active: form.is_active,
                    direct_permission_ids: selectedDirectPermIds,
                    ...(form.password ? { password: form.password } : {}),
                });
                toast.success("User updated");
            } else {
                if (!form.password) { toast.error("Password is required"); setSaving(false); return; }
                await usersApi.create({ ...form, direct_permission_ids: selectedDirectPermIds });
                toast.success("User created");
            }
            setDialogOpen(false);
            load();
        } catch { toast.error("Failed to save user"); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleting) return;
        setSaving(true);
        try {
            await usersApi.delete(deleting.id);
            toast.success("User deleted");
            setDeleteOpen(false);
            setDeleting(null);
            load();
        } catch { toast.error("Failed to delete user"); }
        finally { setSaving(false); }
    };

    const openCreate = () => {
        setEditing(null);
        setForm({ username: "", password: "", role_id: roles[0]?.id || 0, is_active: true });
        setSelectedDirectPermIds([]);
        setDialogOpen(true);
    };
    const openEdit = (u: UserResponse) => {
        setEditing(u);
        setForm({ username: u.username, password: "", role_id: u.role_id, is_active: u.is_active });
        // selectedDirectPermIds is asynchronously populated by the useEffect watching form.role_id
        setDialogOpen(true);
    };

    const togglePermission = (id: number) => {
        if (inheritedPermIds.has(id)) return; // Cannot toggle inherited
        setSelectedDirectPermIds(prev =>
            prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
        );
    };

    const columns: Column<UserResponse>[] = [
        { header: "ID", accessorKey: "id", className: "w-20" },
        { header: "Username", accessorKey: "username" },
        { header: "Role", cell: (row) => <Badge variant="secondary">{row.role?.name || `Role #${row.role_id}`}</Badge> },
        {
            header: "Status",
            cell: (row) => (
                <Badge variant={row.is_active ? "default" : "outline"}>
                    {row.is_active ? "Active" : "Inactive"}
                </Badge>
            ),
        },
        {
            header: "Created",
            cell: (row) => new Date(row.created_at).toLocaleDateString(),
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
            <PageHeader title="Users" description="Manage system users">
                <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add User</Button>
            </PageHeader>

            <DataTable columns={columns} data={data} loading={loading} page={page} totalPages={totalPages} onPageChange={setPage} />

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit User" : "Create User"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Username</Label>
                            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Username" />
                        </div>
                        <div className="space-y-2">
                            <Label>Password {editing && <span className="text-muted-foreground text-xs">(leave blank to keep current)</span>}</Label>
                            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editing ? "New password" : "Password"} />
                        </div>
                        <div className="space-y-2">
                            <Label>Role</Label>
                            <Select value={String(form.role_id)} onValueChange={(v) => setForm({ ...form, role_id: Number(v) })}>
                                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                                <SelectContent>
                                    {roles.map((r) => (
                                        <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-3">
                            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                            <Label>Active</Label>
                        </div>
                        <div className="space-y-2">
                            <Label>Direct Permissions (Overrides Role)</Label>
                            {allPermissions.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No permissions available</p>
                            ) : (
                                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-lg border p-3">
                                    {allPermissions.map((perm) => {
                                        const isInherited = inheritedPermIds.has(perm.id);
                                        const isDirect = selectedDirectPermIds.includes(perm.id);
                                        const isSelected = isInherited || isDirect;

                                        return (
                                            <button
                                                key={perm.id}
                                                type="button"
                                                onClick={() => togglePermission(perm.id)}
                                                disabled={isInherited}
                                                className={cn(
                                                    "flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                                                    isInherited ? "bg-muted text-muted-foreground opacity-70 cursor-not-allowed" :
                                                        isDirect ? "bg-primary/10 text-primary border border-primary/30" :
                                                            "hover:bg-muted border border-transparent"
                                                )}
                                            >
                                                <div className={cn(
                                                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                                                    isInherited ? "bg-muted-foreground/30 border-transparent text-background" :
                                                        isDirect ? "bg-primary border-primary text-primary-foreground" :
                                                            "border-muted-foreground/30"
                                                )}>
                                                    {isSelected && <Check className="h-3 w-3" />}
                                                </div>
                                                <span className="truncate">{perm.slug}</span>
                                                {isInherited && <span className="ml-auto text-[10px] uppercase tracking-wider opacity-60">Role</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            {selectedDirectPermIds.length > 0 && (
                                <p className="text-xs text-muted-foreground">
                                    {selectedDirectPermIds.length} direct override{selectedDirectPermIds.length !== 1 ? "s" : ""} applied.
                                </p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving || !form.username.trim()}>
                            {saving ? "Saving..." : editing ? "Update" : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title="Delete User"
                description={`Are you sure you want to delete "${deleting?.username}"?`}
                onConfirm={handleDelete}
                loading={saving}
            />
        </div>
    );
}
