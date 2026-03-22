import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, MapPin, Crosshair } from "lucide-react";
import { customerApi } from "@/api/customers";
import { serviceabilityApi } from "@/api/serviceability";
import type { CustomerResponse, DeliveryZone } from "@/types";
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
import { Textarea } from "@/components/ui/textarea";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function CustomersPage() {
    const navigate = useNavigate();
    const [data, setData] = useState<CustomerResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [editing, setEditing] = useState<CustomerResponse | null>(null);
    const [deleting, setDeleting] = useState<CustomerResponse | null>(null);
    
    // Form state
    const [form, setForm] = useState({
        name: "",
        phone: "",
        email: "",
        address: "",
        credit_limit: "0",
        payment_terms: "cash",
        customer_category: "retail",
        delivery_route: "",
        internal_notes: "",
        latitude: "",
        longitude: "",
        zone_id: "",
    });

    const [zones, setZones] = useState<DeliveryZone[]>([]);
    const [saving, setSaving] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await customerApi.list(page, 20);
            setData(res.data.data || []);
            setTotalPages(res.data.meta?.total_pages || 1);
        } catch { toast.error("Failed to load customers"); }
        finally { setLoading(false); }
    }, [page]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        serviceabilityApi.listZones().then(res => setZones(res.data.data || []));
    }, []);

    const handleSave = async () => {
        if (!form.name.trim() || !form.phone.trim()) return;
        setSaving(true);
        try {
            const payload = {
                ...form,
                credit_limit: parseFloat(form.credit_limit) || 0,
                latitude: form.latitude ? parseFloat(form.latitude) : undefined,
                longitude: form.longitude ? parseFloat(form.longitude) : undefined,
                zone_id: form.zone_id && form.zone_id !== "0" ? parseInt(form.zone_id) : undefined,
            };

            if (editing) {
                await customerApi.update(editing.id, payload);
                toast.success("Customer updated");
            } else {
                await customerApi.create(payload);
                toast.success("Customer created");
            }
            setDialogOpen(false);
            load();
        } catch (err: any) { 
            toast.error(err.response?.data?.message || "Failed to save customer"); 
        }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleting) return;
        setSaving(true);
        try {
            await customerApi.delete(deleting.id);
            toast.success("Customer deleted");
            setDeleteOpen(false);
            setDeleting(null);
            load();
        } catch { toast.error("Failed to delete. Ensure they have no outstanding sales."); }
        finally { setSaving(false); }
    };

    const openCreate = () => {
        setEditing(null);
        setForm({
            name: "", phone: "", email: "", address: "",
            credit_limit: "0", payment_terms: "cash", customer_category: "retail",
            delivery_route: "", internal_notes: "", latitude: "", longitude: "", zone_id: ""
        });
        setDialogOpen(true);
    };

    const openEdit = (c: CustomerResponse) => {
        setEditing(c);
        setForm({
            name: c.name,
            phone: c.phone,
            email: c.email || "",
            address: c.address || "",
            credit_limit: c.credit_limit.toString(),
            payment_terms: c.payment_terms || "cash",
            customer_category: c.customer_category || "retail",
            delivery_route: c.delivery_route || "",
            internal_notes: c.internal_notes || "",
            latitude: c.latitude?.toString() || "",
            longitude: c.longitude?.toString() || "",
            zone_id: c.zone_id?.toString() || "0",
        });
        setDialogOpen(true);
    };

    const getCurrentLocation = () => {
        if (!navigator.geolocation) return toast.error("Geolocation not supported by your browser");
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setForm(prev => ({
                    ...prev,
                    latitude: pos.coords.latitude.toFixed(6),
                    longitude: pos.coords.longitude.toFixed(6),
                }));
                toast.success("Location pinpointed");
            },
            () => toast.error("Failed to fetch GPS coordinates")
        );
    };

    const columns: Column<CustomerResponse>[] = [
        { header: "Name", accessorKey: "name", className: "font-medium" },
        { header: "Phone", accessorKey: "phone" },
        { 
            header: "Category", 
            accessorKey: "customer_category", 
            cell: (row) => <span className="capitalize">{row.customer_category}</span>
        },
        { 
            header: "Payment Terms", 
            accessorKey: "payment_terms",
            cell: (row) => {
                const terms = row.payment_terms || "cash";
                let bg = "bg-gray-100 text-gray-800";
                if (terms === "cash") bg = "bg-green-100 text-green-800";
                if (terms === "prepaid") bg = "bg-blue-100 text-blue-800";
                if (terms.includes("net_")) bg = "bg-amber-100 text-amber-800";
                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase ${bg}`}>
                        {terms.replace('_', ' ')}
                    </span>
                );
            }
        },
        { 
            header: "Zone", 
            accessorKey: "zone_name", 
            cell: (row) => (
                <div className="flex items-center gap-1 text-sm">
                    {row.zone_name ? (
                        <><MapPin className="h-3 w-3 text-muted-foreground mr-1" />{row.zone_name}</>
                    ) : (
                        <span className="text-muted-foreground italic">Unassigned</span>
                    )}
                </div>
            )
        },
        {
            header: "Actions",
            className: "w-36 text-right",
            cell: (row) => (
                <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500" onClick={(e) => { 
                        e.stopPropagation(); 
                        navigate(`/customers/${row.id}`); 
                    }}>
                        <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500" onClick={(e) => { 
                        e.stopPropagation(); 
                        openEdit(row); 
                    }}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { 
                        e.stopPropagation(); 
                        setDeleting(row); 
                        setDeleteOpen(true); 
                    }}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div>
            <PageHeader title="Customers (CRM)" description="Manage your client base, contact info, and operational terms.">
                <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Customer</Button>
            </PageHeader>

            <DataTable
                columns={columns}
                data={data}
                loading={loading}
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                onRowClick={(row) => navigate(`/customers/${row.id}`)}
                searchPlaceholder="Search customers..."
            />

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit Customer Profile" : "Create Customer"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4 max-h-[70vh] overflow-y-auto px-1">
                        {/* Column 1: Core Details */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-sm border-b pb-2">Core Information</h3>
                            <div className="space-y-2">
                                <Label>Full Name *</Label>
                                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Customer Name" />
                            </div>
                            <div className="space-y-2">
                                <Label>Phone Number *</Label>
                                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Mobile Number" />
                            </div>
                            <div className="space-y-2">
                                <Label>Email Address</Label>
                                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email (Optional)" type="email" />
                            </div>
                            
                            <h3 className="font-semibold text-sm border-b pb-2 pt-4">CRM & Financials</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <Select value={form.customer_category} onValueChange={(v) => setForm({ ...form, customer_category: v })}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="retail">Retail (B2C)</SelectItem>
                                            <SelectItem value="wholesale">Wholesale</SelectItem>
                                            <SelectItem value="b2b">Commercial (B2B)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Payment Terms</Label>
                                    <Select value={form.payment_terms} onValueChange={(v) => setForm({ ...form, payment_terms: v })}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="cash">Cash (COD)</SelectItem>
                                            <SelectItem value="prepaid">Pre-paid (Wallet)</SelectItem>
                                            <SelectItem value="net_15">Net 15 Days</SelectItem>
                                            <SelectItem value="net_30">Net 30 Days</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2">
                                    <Label>Credit Limit (₹)</Label>
                                    <Input value={form.credit_limit} onChange={(e) => setForm({ ...form, credit_limit: e.target.value })} type="number" min="0" />
                                </div>
                            </div>
                        </div>

                        {/* Column 2: Logistics & Map */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-sm border-b pb-2">Logistics & Location</h3>
                            <div className="space-y-2">
                                <Label>Physical Address</Label>
                                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="House, Street, Area" />
                            </div>
                            <div className="space-y-2">
                                <Label>Delivery Route</Label>
                                <Input value={form.delivery_route} onChange={(e) => setForm({ ...form, delivery_route: e.target.value })} placeholder="e.g., Morning Route A" />
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-1">Delivery & Dispatch Instructions <span className="text-[10px] text-muted-foreground font-normal">(Internal)</span></Label>
                                <Textarea className="h-16 resize-none" placeholder="e.g., Leave at back door, beware of dog..." value={form.internal_notes} onChange={(e) => setForm({ ...form, internal_notes: e.target.value })} />
                            </div>

                            <div className="space-y-2 pt-2">
                                <Label className="flex justify-between items-center mb-1">
                                    <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> Pick Location</span>
                                    <Button type="button" variant="secondary" size="sm" className="h-6 text-xs" onClick={getCurrentLocation}>
                                        <Crosshair className="mr-1 h-3 w-3" /> Auto
                                    </Button>
                                </Label>
                                <div className="border rounded overflow-hidden">
                                    <MapPicker 
                                        value={form.latitude && form.longitude ? { lat: parseFloat(form.latitude), lng: parseFloat(form.longitude) } : null}
                                        onChange={(val) => setForm(prev => ({ ...prev, latitude: val.lat.toFixed(6), longitude: val.lng.toFixed(6) }))}
                                        height="150px"
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Assigned Delivery Zone</Label>
                                <Select value={form.zone_id} onValueChange={(v) => setForm({ ...form, zone_id: v })}>
                                    <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">Automatic / Unassigned</SelectItem>
                                        {zones.map(z => <SelectItem key={z.id} value={z.id.toString()}>{z.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving || !form.name.trim() || !form.phone.trim()}>
                            {saving ? "Saving..." : editing ? "Save Changes" : "Create Customer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title="Delete Customer"
                description={`Are you sure you want to delete "${deleting?.name}"? Make sure their account is settled and lacks active sales.`}
                onConfirm={handleDelete}
                loading={saving}
            />
        </div>
    );
}
