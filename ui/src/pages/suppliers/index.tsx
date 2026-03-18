import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, MapPin, Crosshair } from "lucide-react";
import { suppliersApi } from "@/api/suppliers";
import { serviceabilityApi } from "@/api/serviceability";
import type { SupplierResponse, DeliveryZone } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { MapPicker } from "@/components/shared/map-picker";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function SuppliersPage() {
    const navigate = useNavigate();
    const [data, setData] = useState<SupplierResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [editing, setEditing] = useState<SupplierResponse | null>(null);
    const [deleting, setDeleting] = useState<SupplierResponse | null>(null);
    const [form, setForm] = useState<{
        name: string;
        phone: string;
        location: string;
        latitude: string;
        longitude: string;
        zone_id: string;
    }>({ name: "", phone: "", location: "", latitude: "", longitude: "", zone_id: "" });
    const [zones, setZones] = useState<DeliveryZone[]>([]);
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

    useEffect(() => {
        serviceabilityApi.listZones().then(res => setZones(res.data.data || []));
    }, []);

    const handleSave = async () => {
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            const data = {
                ...form,
                latitude: form.latitude ? parseFloat(form.latitude) : undefined,
                longitude: form.longitude ? parseFloat(form.longitude) : undefined,
                zone_id: form.zone_id ? parseInt(form.zone_id) : undefined,
            };
            if (editing) {
                await suppliersApi.update(editing.id, data);
                toast.success("Supplier updated");
            } else {
                await suppliersApi.create(data);
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
        setForm({ name: "", phone: "", location: "", latitude: "", longitude: "", zone_id: "" });
        setDialogOpen(true);
    };
    const openEdit = (s: SupplierResponse) => {
        setEditing(s);
        setForm({
            name: s.name,
            phone: s.phone || "",
            location: s.location || "",
            latitude: s.latitude?.toString() || "",
            longitude: s.longitude?.toString() || "",
            zone_id: s.zone_id?.toString() || "",
        });
        setDialogOpen(true);
    };

    const getCurrentLocation = () => {
        if (!navigator.geolocation) return toast.error("Geolocation not supported");
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setForm(prev => ({
                    ...prev,
                    latitude: pos.coords.latitude.toFixed(6),
                    longitude: pos.coords.longitude.toFixed(6),
                }));
                toast.success("Location updated");
            },
            () => toast.error("Failed to get location")
        );
    };

    const columns: Column<SupplierResponse>[] = [
        { header: "ID", accessorKey: "id", className: "w-20" },
        { header: "Name", accessorKey: "name" },
        { header: "Phone", accessorKey: "phone" },
        { header: "Location", accessorKey: "location" },
        { 
            header: "Zone", 
            accessorKey: "zone_name", 
            className: "w-32",
            cell: (row) => row.zone_name || "-"
        },
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
                    <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1">
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

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" /> Visual Pin Drop
                            </Label>
                            <MapPicker 
                                value={form.latitude && form.longitude ? { lat: parseFloat(form.latitude), lng: parseFloat(form.longitude) } : null}
                                onChange={(val) => setForm(prev => ({ ...prev, latitude: val.lat.toFixed(6), longitude: val.lng.toFixed(6) }))}
                                height="200px"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" /> Latitude
                                </Label>
                                <Input value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="0.000000" />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" /> Longitude
                                </Label>
                                <Input value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="0.000000" />
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" className="w-full" onClick={getCurrentLocation}>
                                <Crosshair className="mr-2 h-4 w-4" /> Use Current Location
                            </Button>
                        </div>

                        <div className="space-y-2">
                            <Label>Assigned Zone (Optional)</Label>
                            <Select value={form.zone_id} onValueChange={(v) => setForm({ ...form, zone_id: v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Automatic (based on GPS)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">Automatic</SelectItem>
                                    {zones.map(z => (
                                        <SelectItem key={z.id} value={z.id.toString()}>{z.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Leave as Automatic to use PostGIS spatial lookup.
                            </p>
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
