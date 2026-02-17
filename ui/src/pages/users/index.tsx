import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { usersApi } from "@/api/users";
import { rolesApi } from "@/api/roles";
import type { UserResponse, RoleResponse } from "@/types";
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

    useEffect(() => { load(); }, [load]);
    useEffect(() => { loadRoles(); }, [loadRoles]);

    const handleSave = async () => {
        if (!form.username.trim() || !form.role_id) return;
        setSaving(true);
        try {
            if (editing) {
                await usersApi.update(editing.id, {
                    username: form.username,
                    role_id: form.role_id,
                    is_active: form.is_active,
                    ...(form.password ? { password: form.password } : {}),
                });
                toast.success("User updated");
            } else {
                if (!form.password) { toast.error("Password is required"); setSaving(false); return; }
                await usersApi.create(form);
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
        setDialogOpen(true);
    };
    const openEdit = (u: UserResponse) => {
        setEditing(u);
        setForm({ username: u.username, password: "", role_id: u.role_id, is_active: u.is_active });
        setDialogOpen(true);
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
