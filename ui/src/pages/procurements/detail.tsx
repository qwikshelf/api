import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";
import { ArrowLeft, Package, CheckCircle2, Truck, PackageCheck, XCircle } from "lucide-react";
import { procurementsApi } from "@/api/procurements";
import type { ProcurementResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const STATUS_COLORS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    pending: "outline",
    draft: "outline",
    approved: "secondary",
    ordered: "default",
    partial: "secondary",
    received: "default",
    cancelled: "destructive",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
    pending: <Package className="h-4 w-4" />,
    draft: <Package className="h-4 w-4" />,
    approved: <CheckCircle2 className="h-4 w-4" />,
    ordered: <Truck className="h-4 w-4" />,
    partial: <Package className="h-4 w-4" />,
    received: <PackageCheck className="h-4 w-4" />,
    cancelled: <XCircle className="h-4 w-4" />,
};

// Workflow: draft → approved → ordered → received
// Any non-terminal status can be cancelled
// Workflow definitions
const WORKFLOW_ACTIONS: Record<string, { label: string; status: string; variant: "default" | "destructive" }[]> = {
    pending: [
        { label: "Approve", status: "approved", variant: "default" },
        { label: "Cancel", status: "cancelled", variant: "destructive" },
    ],
    draft: [
        { label: "Approve", status: "approved", variant: "default" },
        { label: "Cancel", status: "cancelled", variant: "destructive" },
    ],
    approved: [
        { label: "Mark as Ordered", status: "ordered", variant: "default" },
        { label: "Cancel", status: "cancelled", variant: "destructive" },
    ],
    ordered: [
        { label: "Mark as Received", status: "received", variant: "default" },
        { label: "Cancel", status: "cancelled", variant: "destructive" },
    ],
    partial: [
        { label: "Mark as Received", status: "received", variant: "default" },
        { label: "Cancel", status: "cancelled", variant: "destructive" },
    ],
};

export default function ProcurementDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const poId = Number(id);

    const [po, setPo] = useState<ProcurementResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [statusSaving, setStatusSaving] = useState(false);
    const user = useAuthStore((s) => s.user);
    const isAdminOrManager = user?.role?.name?.toLowerCase() === "admin" || user?.role?.name?.toLowerCase() === "manager";

    // Receive items dialog
    const [receiveOpen, setReceiveOpen] = useState(false);
    const [receiveItems, setReceiveItems] = useState<{ item_id: number; quantity_received: string; label: string; max: string }[]>([]);
    const [receiveSaving, setReceiveSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await procurementsApi.get(poId);
            setPo(res.data.data);
        } catch { toast.error("Failed to load purchase order"); navigate("/procurements"); }
        finally { setLoading(false); }
    }, [poId, navigate]);

    useEffect(() => { load(); }, [load]);

    const handleStatusChange = async (newStatus: string) => {
        setStatusSaving(true);
        try {
            await procurementsApi.updateStatus(poId, newStatus);
            toast.success(`Status updated to ${newStatus}`);
            load();
        } catch { toast.error("Failed to update status"); }
        finally { setStatusSaving(false); }
    };

    const openReceive = () => {
        if (!po?.items) return;
        setReceiveItems(
            po.items.map((item) => ({
                item_id: item.id,
                quantity_received: "",
                label: `${item.variant_name || `Variant #${item.variant_id}`} (${item.variant_sku || "—"})`,
                max: item.quantity_ordered,
            }))
        );
        setReceiveOpen(true);
    };

    const updateReceiveQty = (index: number, value: string) => {
        const updated = [...receiveItems];
        updated[index].quantity_received = value;
        setReceiveItems(updated);
    };

    const handleReceive = async () => {
        const valid = receiveItems.filter((i) => i.quantity_received && parseFloat(i.quantity_received) > 0);
        if (!valid.length) { toast.error("Enter quantities for at least one item"); return; }
        setReceiveSaving(true);
        try {
            await procurementsApi.receiveItems(poId, valid.map((i) => ({
                item_id: i.item_id,
                quantity_received: i.quantity_received,
            })));
            toast.success("Items received");
            setReceiveOpen(false);
            load();
        } catch { toast.error("Failed to receive items"); }
        finally { setReceiveSaving(false); }
    };

    const availableActions = useMemo(() => {
        if (!po) return [];
        const standardActions = WORKFLOW_ACTIONS[po.status] || [];

        if (isAdminOrManager) {
            // Admins can transition to almost anything from anywhere if not terminal
            const isTerminal = po.status === "received" || po.status === "cancelled";
            if (isTerminal) return [];

            const allPossible: { label: string; status: string; variant: "default" | "destructive" | "outline" | "secondary" }[] = [
                { label: "Approve", status: "approved", variant: "secondary" },
                { label: "Order", status: "ordered", variant: "secondary" },
                { label: "Receive", status: "received", variant: "default" },
                { label: "Cancel", status: "cancelled", variant: "destructive" },
            ];

            // Filter out current status
            return allPossible.filter(a => a.status !== po.status);
        }

        return standardActions;
    }, [po, isAdminOrManager]);

    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-60 w-full" />
            </div>
        );
    }

    if (!po) return null;

    const isTerminal = po.status === "received" || po.status === "cancelled";

    return (
        <div className="max-w-4xl">
            <Button variant="ghost" size="sm" onClick={() => navigate("/procurements")} className="mb-4 -ml-2">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Procurements
            </Button>

            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {STATUS_ICONS[po.status] || <Package className="h-6 w-6" />}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold font-mono">PO #{po.id}</h1>
                        <p className="text-muted-foreground text-sm">
                            Created {new Date(po.created_at).toLocaleDateString()}
                        </p>
                    </div>
                </div>
                <Badge variant={STATUS_COLORS[po.status] || "outline"} className="capitalize text-sm px-3 py-1">
                    {po.status}
                </Badge>
            </div>

            {/* Order Info */}
            <Card className="mb-6">
                <CardContent className="pt-6">
                    <div className="grid grid-cols-4 gap-6">
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">Supplier</p>
                            <p className="font-medium">{po.supplier_name || `#${po.supplier_id}`}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">Warehouse</p>
                            <p className="font-medium">{po.warehouse_name || `#${po.warehouse_id}`}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">Expected Delivery</p>
                            <p className="font-medium">{po.expected_delivery ? new Date(po.expected_delivery).toLocaleDateString() : "—"}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">Total Cost</p>
                            <p className="font-bold text-lg font-mono">₹{po.total_cost}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Items Table */}
            <Card className="mb-6">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Items</CardTitle>
                        {po.status === "ordered" && (
                            <Button size="sm" onClick={openReceive}>
                                <PackageCheck className="mr-2 h-4 w-4" /> Receive Items
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead className="w-20">Unit</TableHead>
                                    <TableHead className="w-28 text-right">Ordered</TableHead>
                                    <TableHead className="w-28 text-right">Received</TableHead>
                                    <TableHead className="w-28 text-right">Unit Cost</TableHead>
                                    <TableHead className="w-28 text-right">Line Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(po.items || []).map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{item.variant_name || `Variant #${item.variant_id}`}</p>
                                                <p className="text-xs text-muted-foreground font-mono">{item.variant_sku}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{item.variant_unit || "—"}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">{item.quantity_ordered}</TableCell>
                                        <TableCell className="text-right">
                                            <ReceiveProgress ordered={item.quantity_ordered} received={item.quantity_received} />
                                        </TableCell>
                                        <TableCell className="text-right font-mono">₹{item.unit_cost}</TableCell>
                                        <TableCell className="text-right font-mono font-medium">₹{item.line_total}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Status Actions */}
            {!isTerminal && availableActions.length > 0 && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Actions</p>
                                <p className="text-sm text-muted-foreground">Update the purchase order status</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {availableActions.map((action) => (
                                    <Button
                                        key={action.status}
                                        variant={action.variant as any}
                                        onClick={() => handleStatusChange(action.status)}
                                        disabled={statusSaving}
                                        size="sm"
                                    >
                                        {action.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Receive Items Dialog */}
            <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Receive Items</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4 max-h-80 overflow-y-auto">
                        {receiveItems.map((item, idx) => (
                            <div key={item.item_id} className="flex items-center gap-4">
                                <div className="flex-1">
                                    <Label className="text-sm">{item.label}</Label>
                                    <p className="text-xs text-muted-foreground">Ordered: {item.max}</p>
                                </div>
                                <div className="w-28">
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={item.quantity_received}
                                        onChange={(e) => updateReceiveQty(idx, e.target.value)}
                                        placeholder="Qty"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReceiveOpen(false)}>Cancel</Button>
                        <Button onClick={handleReceive} disabled={receiveSaving}>
                            {receiveSaving ? "Receiving..." : "Confirm Receipt"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function ReceiveProgress({ ordered, received }: { ordered: string; received: string }) {
    const o = parseFloat(ordered) || 0;
    const r = parseFloat(received) || 0;
    const pct = o > 0 ? Math.min((r / o) * 100, 100) : 0;

    if (r === 0) return <span className="text-muted-foreground font-mono">0</span>;
    if (r >= o) return <span className="text-green-600 font-mono font-medium">{received} ✓</span>;

    return (
        <div className="flex items-center gap-2 justify-end">
            <span className="font-mono text-amber-600">{received}</span>
            <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}
