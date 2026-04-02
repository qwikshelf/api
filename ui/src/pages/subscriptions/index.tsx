import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { Eye, PlayCircle, PauseCircle, XCircle } from "lucide-react";
import { subscriptionsApi } from "@/api/subscriptions";
import type { SubscriptionResponse, SubscriptionStatus } from "@/types/subscription";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function SubscriptionsPage() {
    const navigate = useNavigate();
    const [data, setData] = useState<SubscriptionResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusConfirm, setStatusConfirm] = useState<{sub: SubscriptionResponse, newStatus: SubscriptionStatus} | null>(null);
    const [updating, setUpdating] = useState(false);
    
    // Filters
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [filterFrequency, setFilterFrequency] = useState<string>("all");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, any> = {};
            if (filterStatus !== "all") params.status = filterStatus;
            if (filterFrequency !== "all") params.frequency = filterFrequency;
            
            const res = await subscriptionsApi.list(params);
            setData(res.data.data || []);
        } catch { 
            toast.error("Failed to load subscriptions"); 
        } finally { 
            setLoading(false); 
        }
    }, [filterStatus, filterFrequency]);

    useEffect(() => { load(); }, [load]);

    const handleUpdateStatus = async () => {
        if (!statusConfirm) return;
        setUpdating(true);
        try {
            await subscriptionsApi.updateStatus(statusConfirm.sub.id, { status: statusConfirm.newStatus });
            toast.success(`Subscription marked as ${statusConfirm.newStatus}`);
            setStatusConfirm(null);
            load();
        } catch {
            toast.error("Failed to update status");
        } finally {
            setUpdating(false);
        }
    };

    const columns: Column<SubscriptionResponse>[] = [
        { 
            header: "ID", 
            accessorKey: "id", 
            className: "w-16 font-medium text-muted-foreground",
            cell: (row) => `#${row.id}`
        },
        { 
            header: "Customer", 
            accessorKey: "customer_name", 
            className: "font-medium" 
        },
        { 
            header: "Products", 
            accessorKey: "items", 
            cell: (row) => (
                <div className="flex flex-col gap-1">
                    {row.items?.map(p => (
                        <div key={p.id} className="text-sm">
                            <span className="text-slate-700">{p.variant_name}</span>{" "}
                            <span className="text-muted-foreground">({p.quantity} {p.unit})</span>
                        </div>
                    ))}
                </div>
            )
        },
        { 
            header: "Frequency", 
            accessorKey: "frequency", 
            cell: (row) => <Badge variant="outline" className="capitalize">{row.frequency.replace('_', ' ')}</Badge>
        },
        { 
            header: "Status", 
            accessorKey: "status", 
            cell: (row) => {
                const s = row.status;
                let bg = "bg-slate-100 text-slate-800";
                if (s === "active") bg = "bg-emerald-100 text-emerald-800";
                if (s === "paused") bg = "bg-amber-100 text-amber-800";
                if (s === "cancelled") bg = "bg-red-100 text-red-800";
                
                return (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${bg}`}>
                        {s}
                    </span>
                );
            }
        },
        { 
            header: "Duration", 
            accessorKey: "start_date", 
            cell: (row) => (
                <div className="text-sm text-muted-foreground">
                    <div>{format(new Date(row.start_date), "MMM d, yyyy")}</div>
                    <div>to {row.end_date ? format(new Date(row.end_date), "MMM d, yyyy") : "Ongoing"}</div>
                </div>
            )
        },
        {
            header: "Actions",
            className: "w-32 text-right",
            cell: (row) => (
                <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500" title="View Customer" onClick={(e) => { 
                        e.stopPropagation(); 
                        navigate(`/customers/${row.customer_id}`); 
                    }}>
                        <Eye className="h-4 w-4" />
                    </Button>

                    {row.status === "active" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600" title="Pause" onClick={(e) => { 
                            e.stopPropagation(); 
                            setStatusConfirm({sub: row, newStatus: "paused"}); 
                        }}>
                            <PauseCircle className="h-4 w-4" />
                        </Button>
                    )}
                    
                    {row.status === "paused" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" title="Resume" onClick={(e) => { 
                            e.stopPropagation(); 
                            setStatusConfirm({sub: row, newStatus: "active"}); 
                        }}>
                            <PlayCircle className="h-4 w-4" />
                        </Button>
                    )}
                    
                    {row.status !== "cancelled" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" title="Cancel" onClick={(e) => { 
                            e.stopPropagation(); 
                            setStatusConfirm({sub: row, newStatus: "cancelled"}); 
                        }}>
                            <XCircle className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Global Subscriptions" 
                description="View, monitor, and manage ongoing product subscriptions across all customers."
            />

            <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-600">Status:</span>
                    <select 
                        className="h-9 px-3 py-1 text-sm border rounded-md min-w-[140px] focus:outline-none focus:ring-2 focus:ring-slate-400"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
                
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-600">Frequency:</span>
                    <select 
                        className="h-9 px-3 py-1 text-sm border rounded-md min-w-[140px] focus:outline-none focus:ring-2 focus:ring-slate-400"
                        value={filterFrequency}
                        onChange={(e) => setFilterFrequency(e.target.value)}
                    >
                        <option value="all">All Frequencies</option>
                        <option value="daily">Daily</option>
                        <option value="alternate_days">Alternate Days</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                    </select>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={data}
                loading={loading}
                searchPlaceholder="Search customer names or products..."
                onRowClick={(row) => navigate(`/customers/${row.customer_id}`)}
                // Implement local searching on the data if no server-side pagination is wired yet
            />

            <ConfirmDialog
                open={!!statusConfirm}
                onOpenChange={(open) => !open && setStatusConfirm(null)}
                title={`Mark as ${statusConfirm?.newStatus}?`}
                description={
                    statusConfirm?.newStatus === "cancelled" 
                        ? `Are you sure you want to completely cancel the subscription for ${statusConfirm.sub.customer_name}? This cannot be undone.`
                        : `Are you sure you want to mark this subscription as ${statusConfirm?.newStatus}?`
                }
                onConfirm={handleUpdateStatus}
                loading={updating}
            />
        </div>
    );
}
