import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { Eye, FileText, PlusCircle, RefreshCw, AlertCircle } from "lucide-react";
import { subscriptionsApi } from "@/api/subscriptions";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SubscriptionInvoicesPage() {
    const navigate = useNavigate();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [filterMonth, setFilterMonth] = useState<string>(format(new Date(), "yyyy-MM"));

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, any> = {};
            if (filterStatus !== "all") params.status = filterStatus;
            if (filterMonth) params.month = filterMonth;
            
            const res = await subscriptionsApi.listInvoices(params);
            setData(res.data.data || []);
        } catch { 
            toast.error("Failed to load invoices"); 
        } finally { 
            setLoading(false); 
        }
    }, [filterStatus, filterMonth]);

    useEffect(() => { load(); }, [load]);

    const columns: Column<any>[] = [
        { 
            header: "ID", 
            accessorKey: "id", 
            className: "w-16 font-medium text-muted-foreground",
            cell: (row) => `#${row.id}`
        },
        { 
            header: "Period", 
            accessorKey: "billing_period_start", 
            cell: (row) => (
                <div className="font-medium">
                    {format(new Date(row.billing_period_start), "MMM yyyy")}
                </div>
            )
        },
        { 
            header: "Subscription ID", 
            accessorKey: "subscription_id", 
            cell: (row) => `#${row.subscription_id}`
        },
        { 
            header: "Amount", 
            accessorKey: "total_amount", 
            cell: (row) => (
                <div className="font-bold text-slate-900">
                    ₹{Number(row.total_amount).toLocaleString()}
                </div>
            )
        },
        { 
            header: "Status", 
            accessorKey: "status", 
            cell: (row) => {
                const s = row.status;
                let variant: "outline" | "default" | "secondary" | "destructive" = "outline";
                if (s === "paid") variant = "default";
                if (s === "draft") variant = "secondary";
                if (s === "overdue") variant = "destructive";
                
                return <Badge variant={variant} className="capitalize">{s}</Badge>;
            }
        },
        { 
            header: "Due Date", 
            accessorKey: "due_date", 
            cell: (row) => format(new Date(row.due_date), "MMM d, yyyy")
        },
        {
            header: "Actions",
            className: "w-24 text-right",
            cell: (row) => (
                <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500" onClick={() => navigate(`/subscriptions/invoices/${row.id}`)}>
                        <Eye className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    const stats = {
        total: data.reduce((acc, inv) => acc + Number(inv.total_amount), 0),
        pending: data.filter(i => i.status !== "paid").reduce((acc, inv) => acc + Number(inv.total_amount), 0),
        overdueCount: data.filter(i => i.status === "overdue").length
    };

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Monthly Invoices" 
                description="Manage billing cycles and payment status for subscription customers."
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-50 border-none shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-500" /> Total Invoiced (This View)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{stats.total.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-50 border-none shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-amber-500" /> Total Outstanding
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">₹{stats.pending.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-50 border-none shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-500" /> Overdue Bills
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.overdueCount}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-600">Month:</span>
                        <input 
                            type="month"
                            className="h-9 px-3 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400"
                            value={filterMonth}
                            onChange={(e) => setFilterMonth(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-600">Status:</span>
                        <select 
                            className="h-9 px-3 py-1 text-sm border rounded-md min-w-[140px] focus:outline-none focus:ring-2 focus:ring-slate-400"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="all">All Statuses</option>
                            <option value="draft">Draft</option>
                            <option value="finalized">Finalized</option>
                            <option value="paid">Paid</option>
                            <option value="overdue">Overdue</option>
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={load}>
                        <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                    </Button>
                    <Button size="sm" onClick={() => navigate("/subscriptions")}>
                        <PlusCircle className="h-4 w-4 mr-2" /> Generate New Bills
                    </Button>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={data}
                loading={loading}
                searchPlaceholder="Search invoices..."
                onRowClick={(row) => navigate(`/subscriptions/invoices/${row.id}`)}
            />
        </div>
    );
}
