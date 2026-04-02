import { useState, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Calendar, CheckCircle2, XCircle, AlertCircle, RefreshCw, Loader2, StickyNote } from "lucide-react";

import { subscriptionsApi } from "@/api/subscriptions";
import type { DailyRosterItemResponse } from "@/types/subscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function DeliveriesPage() {
    const defaultDate = format(new Date(), "yyyy-MM-dd");
    const [selectedDate, setSelectedDate] = useState(defaultDate);
    const [roster, setRoster] = useState<DailyRosterItemResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    const loadRoster = async () => {
        setLoading(true);
        try {
            const res = await subscriptionsApi.getDailyRoster(selectedDate);
            setRoster(res.data.data || []);
        } catch (err) {
            toast.error("Failed to load delivery roster");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRoster();
    }, [selectedDate]);

    const handleRecord = async (subId: number, status: "delivered" | "failed" | "skipped", e: React.MouseEvent) => {
        e.preventDefault();
        setActionLoading(subId);
        try {
            await subscriptionsApi.recordDelivery(subId, { date: selectedDate, status });
            toast.success(`Marked as ${status}`);
            loadRoster();
        } catch (err) {
            toast.error(`Failed to mark as ${status}`);
        } finally {
            setActionLoading(null);
        }
    };

    const getStatusBadge = (delivery?: DailyRosterItemResponse["delivery"]) => {
        if (!delivery) return <Badge variant="outline" className="text-amber-600 border-amber-200">Pending Update</Badge>;
        
        switch (delivery.status) {
            case "delivered": return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800"><CheckCircle2 className="w-3 h-3 mr-1" /> Delivered</Badge>;
            case "failed": return <Badge variant="secondary" className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
            case "skipped": return <Badge variant="secondary" className="bg-slate-100 text-slate-700"><AlertCircle className="w-3 h-3 mr-1" /> Skipped</Badge>;
            default: return null;
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Daily Deliveries Roster</h1>
                    <p className="text-muted-foreground text-sm mt-1">Track subscription fulfillment and agent deliveries.</p>
                </div>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-48">
                        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Button variant="outline" size="icon" onClick={loadRoster} title="Refresh Roster">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {loading && roster.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin mb-4" />
                    <p>Loading expected deliveries...</p>
                </div>
            ) : roster.length === 0 ? (
                <div className="border border-dashed rounded-xl p-12 text-center bg-slate-50 flex flex-col items-center">
                    <CheckCircle2 className="h-12 w-12 text-slate-300 mb-3" />
                    <h3 className="text-lg font-medium text-slate-700">No deliveries scheduled</h3>
                    <p className="text-slate-500 text-sm mt-1 max-w-sm">
                        There are no active subscriptions scheduled for fulfillment on {format(new Date(selectedDate), "MMM do, yyyy")}.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {roster.map((item) => {
                        const sub = item.subscription;
                        const isPending = !item.delivery;

                        return (
                            <Card key={sub.id} className={`overflow-hidden transition-all duration-200 ${isPending ? 'border-primary/20 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-80'}`}>
                                <CardContent className="p-0">
                                    <div className="flex flex-col md:flex-row">
                                        
                                        {/* Info Section */}
                                        <div className="flex-1 p-4 md:border-r">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h3 className="font-semibold text-lg text-slate-900">{sub.customer_name}</h3>
                                                    <div className="flex gap-2 items-center mt-1">
                                                        <Badge variant="outline" className="text-xs">{sub.frequency}</Badge>
                                                        {getStatusBadge(item.delivery)}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-medium">#{sub.id}</div>
                                                </div>
                                            </div>

                                            <div className="mt-3 space-y-1">
                                                {sub.items.map(p => (
                                                    <div key={p.id} className="text-sm flex justify-between">
                                                        <span className="text-slate-600">{p.variant_name}</span>
                                                        <span className="font-medium">{p.quantity} {p.unit}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {sub.delivery_instructions && (
                                                <div className="mt-3 bg-amber-50 text-amber-800 text-xs px-2 py-1.5 rounded-md flex items-start gap-1.5 border border-amber-100">
                                                    <StickyNote className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                                    <span className="italic">{sub.delivery_instructions}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Section */}
                                        <div className="bg-slate-50/50 p-4 shrink-0 flex flex-row md:flex-col justify-end md:justify-center items-center gap-2 md:w-36">
                                            {item.delivery?.status === "delivered" ? (
                                                <Button size="sm" variant="outline" className="w-full text-xs text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100" 
                                                    disabled={actionLoading === sub.id}
                                                    onClick={(e) => handleRecord(sub.id, "failed", e)}
                                                >
                                                    Mark Failed
                                                </Button>
                                            ) : (
                                                <Button size="sm" className="w-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white" 
                                                    disabled={actionLoading === sub.id}
                                                    onClick={(e) => handleRecord(sub.id, "delivered", e)}
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                                    Delivered
                                                </Button>
                                            )}
                                            
                                            {isPending && (
                                                <div className="flex gap-2 w-full mt-2">
                                                    <Button size="sm" variant="outline" className="flex-1 text-xs" 
                                                        disabled={actionLoading === sub.id}
                                                        onClick={(e) => handleRecord(sub.id, "failed", e)}
                                                    >
                                                        Failed
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="flex-1 text-xs"
                                                        disabled={actionLoading === sub.id}
                                                        onClick={(e) => handleRecord(sub.id, "skipped", e)}
                                                    >
                                                        Skip
                                                    </Button>
                                                </div>
                                            )}
                                            
                                            {!isPending && item.delivery?.status !== "delivered" && (
                                                <Button size="sm" variant="outline" className="w-full text-xs mt-2"
                                                    disabled={actionLoading === sub.id}
                                                    onClick={(e) => handleRecord(sub.id, "skipped", e)}
                                                >
                                                    Update to Skipped
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    );
}
