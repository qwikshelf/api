import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
    CalendarDays,
    RefreshCw,
    Pencil,
    Trash2,
    PauseCircle,
    PlayCircle,
    X,
    ChevronDown,
    ChevronUp,
    Package2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { subscriptionsApi } from "@/api/subscriptions";
import type { SubscriptionResponse, SubscriptionStatus } from "@/types/subscription";

interface SubscriptionCardProps {
    subscription: SubscriptionResponse;
    onEdit: (sub: SubscriptionResponse) => void;
    onRefresh: () => void;
}

const STATUS_CONFIG: Record<SubscriptionStatus, { label: string; className: string }> = {
    active: { label: "Active", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    paused: { label: "Paused", className: "bg-amber-100 text-amber-800 border-amber-200" },
    cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700 border-red-200" },
};

const FREQUENCY_LABELS: Record<string, string> = {
    daily: "Daily",
    alternate_days: "Alternate Days",
    weekly: "Weekly",
    monthly: "Monthly",
};

export function SubscriptionCard({ subscription: sub, onEdit, onRefresh }: SubscriptionCardProps) {
    const [expanded, setExpanded] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const statusCfg = STATUS_CONFIG[sub.status];

    const handleStatusChange = async (newStatus: SubscriptionStatus) => {
        setActionLoading(true);
        try {
            await subscriptionsApi.updateStatus(sub.id, { status: newStatus });
            toast.success(`Subscription ${newStatus}`);
            onRefresh();
        } catch {
            toast.error("Failed to update subscription status");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        setActionLoading(true);
        try {
            await subscriptionsApi.delete(sub.id);
            toast.success("Subscription deleted");
            onRefresh();
        } catch {
            toast.error("Failed to delete subscription");
        } finally {
            setActionLoading(false);
            setConfirmDelete(false);
        }
    };

    return (
        <>
            <div className="border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                {/* Card Header */}
                <div className="flex items-start justify-between px-4 py-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <RefreshCw className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm">
                                    {FREQUENCY_LABELS[sub.frequency] ?? sub.frequency}
                                </span>
                                <Badge
                                    variant="outline"
                                    className={`text-xs px-2 py-0 ${statusCfg.className}`}
                                >
                                    {statusCfg.label}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                    <CalendarDays className="h-3 w-3" />
                                    {format(new Date(sub.start_date), "dd MMM yyyy")}
                                    {sub.end_date && ` → ${format(new Date(sub.end_date), "dd MMM yyyy")}`}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Package2 className="h-3 w-3" />
                                    {sub.items.length} product{sub.items.length !== 1 ? "s" : ""}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                        {sub.status === "active" && (
                            <Button
                                variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                title="Pause subscription"
                                disabled={actionLoading}
                                onClick={() => handleStatusChange("paused")}
                            >
                                <PauseCircle className="h-4 w-4" />
                            </Button>
                        )}
                        {sub.status === "paused" && (
                            <Button
                                variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                title="Resume subscription"
                                disabled={actionLoading}
                                onClick={() => handleStatusChange("active")}
                            >
                                <PlayCircle className="h-4 w-4" />
                            </Button>
                        )}
                        {sub.status !== "cancelled" && (
                            <>
                                <Button
                                    variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                    title="Edit subscription"
                                    disabled={actionLoading}
                                    onClick={() => onEdit(sub)}
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    title="Cancel subscription"
                                    disabled={actionLoading}
                                    onClick={() => handleStatusChange("cancelled")}
                                >
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </>
                        )}
                        <Button
                            variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            title="Delete permanently"
                            disabled={actionLoading}
                            onClick={() => setConfirmDelete(true)}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"
                            onClick={() => setExpanded(e => !e)}
                        >
                            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                {/* Expandable items list */}
                {expanded && (
                    <div className="border-t px-4 py-3 bg-slate-50 rounded-b-xl space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Products</p>
                        {sub.items.map(item => (
                            <div key={item.id} className="flex items-center justify-between text-sm bg-white border rounded-lg px-3 py-2">
                                <div>
                                    <span className="font-medium">{item.variant_name}</span>
                                    <span className="text-muted-foreground ml-2 text-xs">{item.family_name}</span>
                                </div>
                                <div className="font-mono text-sm font-semibold text-primary">
                                    {item.quantity} <span className="text-xs text-muted-foreground font-normal">{item.unit}</span>
                                </div>
                            </div>
                        ))}
                        {sub.delivery_instructions && (
                            <div className="mt-2 text-xs text-muted-foreground bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 italic">
                                📝 {sub.delivery_instructions}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Delete confirmation */}
            <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Subscription?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this subscription and all its product items. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={handleDelete}
                        >
                            Delete Permanently
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
