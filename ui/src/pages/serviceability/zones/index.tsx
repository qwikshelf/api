import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { serviceabilityApi } from "@/api/serviceability";
import { warehousesApi } from "@/api/warehouses";
import type { DeliveryZone, WarehouseResponse } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function DeliveryZonesPage() {
    const [data, setData] = useState<DeliveryZone[]>([]);
    const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<DeliveryZone | null>(null);
    const [saving, setSaving] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [warehouseId, setWarehouseId] = useState<string>("");
    const [minOrder, setMinOrder] = useState("0");
    const [deliveryCharge, setDeliveryCharge] = useState("0");
    const [etaText, setEtaText] = useState("");

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [zonesRes, whRes] = await Promise.all([
                serviceabilityApi.listZones(),
                warehousesApi.list()
            ]);
            setData(zonesRes.data.data || []);
            setWarehouses(whRes.data.data || []);
        } catch {
            toast.error("Failed to load delivery zones data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = async () => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            const payload = {
                name,
                warehouse_id: warehouseId ? parseInt(warehouseId) : undefined,
                min_order_amount: parseFloat(minOrder) || 0,
                delivery_charge: parseFloat(deliveryCharge) || 0,
                estimated_delivery_text: etaText,
            };

            if (editing) {
                await serviceabilityApi.updateZone(editing.id, payload);
                toast.success("Zone updated");
            } else {
                await serviceabilityApi.createZone(payload);
                toast.success("Zone created");
            }
            setDialogOpen(false);
            loadData();
        } catch {
            toast.error("Failed to save zone");
        } finally {
            setSaving(false);
        }
    };

    const openCreate = () => {
        setEditing(null);
        setName("");
        setWarehouseId("");
        setMinOrder("0");
        setDeliveryCharge("0");
        setEtaText("2-3 Hours");
        setDialogOpen(true);
    };

    const openEdit = (zone: DeliveryZone) => {
        setEditing(zone);
        setName(zone.name);
        setWarehouseId(zone.warehouse_id?.toString() || "");
        setMinOrder(zone.min_order_amount.toString());
        setDeliveryCharge(zone.delivery_charge.toString());
        setEtaText(zone.estimated_delivery_text);
        setDialogOpen(true);
    };

    const columns: Column<DeliveryZone>[] = [
        { header: "Name", accessorKey: "name", className: "font-medium" },
        { 
            header: "Warehouse", 
            accessorKey: "warehouse_name",
            cell: (row) => row.warehouse_name || <span className="text-muted-foreground italic">None</span>
        },
        { 
            header: "Min Order", 
            accessorKey: "min_order_amount",
            cell: (row) => `₹${row.min_order_amount}`
        },
        { 
            header: "Charge", 
            accessorKey: "delivery_charge",
            cell: (row) => (
                <Badge variant={row.delivery_charge === 0 ? "secondary" : "outline"}>
                    {row.delivery_charge === 0 ? "Free" : `₹${row.delivery_charge}`}
                </Badge>
            )
        },
        { header: "ETA", accessorKey: "estimated_delivery_text" },
        {
            header: "Actions",
            className: "w-20 text-right",
            cell: (row) => (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}>
                    <Pencil className="h-4 w-4" />
                </Button>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader title="Delivery Zones" description="Configure delivery rules and charges for different areas">
                <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Create Zone</Button>
            </PageHeader>

            <DataTable columns={columns} data={data} loading={loading} />

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit Zone" : "Create Zone"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Zone Name</Label>
                            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. South Delhi, Mumbai West" />
                        </div>

                        <div className="space-y-2">
                            <Label>Serving Warehouse</Label>
                            <Select value={warehouseId} onValueChange={setWarehouseId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select warehouse" />
                                </SelectTrigger>
                                <SelectContent>
                                    {warehouses.map((wh) => (
                                        <SelectItem key={wh.id} value={wh.id.toString()}>{wh.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="min">Min Order (₹)</Label>
                                <Input id="min" type="number" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="charge">Delivery Charge (₹)</Label>
                                <Input id="charge" type="number" value={deliveryCharge} onChange={(e) => setDeliveryCharge(e.target.value)} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="eta">Estimated Delivery Text</Label>
                            <Input id="eta" value={etaText} onChange={(e) => setEtaText(e.target.value)} placeholder="e.g. 45-60 Mins" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving || !name.trim()}>
                            {saving ? "Saving..." : editing ? "Update Zone" : "Create Zone"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
