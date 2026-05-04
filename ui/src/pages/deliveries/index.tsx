import { useState, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Calendar, CheckCircle2, XCircle, AlertCircle, RefreshCw, Loader2, StickyNote, Settings2, Plus, Trash2 } from "lucide-react";

import { subscriptionsApi } from "@/api/subscriptions";
import { productsApi } from "@/api/products";
import type { DailyRosterItemResponse, SubscriptionItemResponse } from "@/types/subscription";
import type { ProductVariant } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function DeliveriesPage() {
    const defaultDate = format(new Date(), "yyyy-MM-dd");
    const [selectedDate, setSelectedDate] = useState(defaultDate);
    const [roster, setRoster] = useState<DailyRosterItemResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    // Adjustment Modal State
    const [adjustModalOpen, setAdjustModalOpen] = useState(false);
    const [adjustingSub, setAdjustingSub] = useState<DailyRosterItemResponse | null>(null);
    const [adjustedItems, setAdjustedItems] = useState<{ variant_id: number; variant_name: string; quantity: number }[]>([]);
    const [allVariants, setAllVariants] = useState<ProductVariant[]>([]);

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

    const loadVariants = async () => {
        try {
            const res = await productsApi.list(1, 100); // Fetch up to 100 variants
            setAllVariants(res.data.data || []);
        } catch (err) {
            console.error("Failed to load variants", err);
        }
    };

    useEffect(() => {
        loadRoster();
        loadVariants();
    }, [selectedDate]);

    const handleRecord = async (subId: number, status: "delivered" | "failed" | "skipped", items?: { variant_id: number; quantity: number }[]) => {
        setActionLoading(subId);
        try {
            await subscriptionsApi.recordDelivery(subId, { 
                date: selectedDate, 
                status,
                items: items
            });
            toast.success(`Marked as ${status}`);
            setAdjustModalOpen(false);
            loadRoster();
        } catch (err) {
            toast.error(`Failed to mark as ${status}`);
        } finally {
            setActionLoading(null);
        }
    };

    const openAdjustModal = (item: DailyRosterItemResponse) => {
        setAdjustingSub(item);
        setAdjustedItems(item.subscription.items.map(i => ({
            variant_id: i.variant_id,
            variant_name: i.variant_name,
            quantity: i.quantity
        })));
        setAdjustModalOpen(true);
    };

    const updateItemQuantity = (variantId: number, qty: number) => {
        setAdjustedItems(prev => prev.map(item => 
            item.variant_id === variantId ? { ...item, quantity: Math.max(0.1, qty) } : item
        ));
    };

    const removeItem = (variantId: number) => {
        setAdjustedItems(prev => prev.filter(i => i.variant_id !== variantId));
    };

    const addNewItem = (variantId: string) => {
        const variant = allVariants.find(v => v.id.toString() === variantId);
        if (!variant) return;
        
        if (adjustedItems.find(i => i.variant_id === variant.id)) {
            toast.error("Item already added");
            return;
        }

        setAdjustedItems(prev => [...prev, {
            variant_id: variant.id,
            variant_name: variant.name,
            quantity: 1
        }]);
    };

    const getStatusBadge = (delivery?: DailyRosterItemResponse["delivery"]) => {
        if (!delivery) return <Badge variant="outline" className="text-amber-600 border-amber-200">Pending Update</Badge>;
        
        const isCustom = (delivery as any).is_custom;

        switch (delivery.status) {
            case "delivered": return (
                <div className="flex gap-1">
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800"><CheckCircle2 className="w-3 h-3 mr-1" /> Delivered</Badge>
                    {isCustom && <Badge variant="outline" className="border-emerald-200 text-emerald-600 bg-emerald-50/50">Customized</Badge>}
                </div>
            );
            case "failed": return <Badge variant="secondary" className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
            case "skipped": return <Badge variant="secondary" className="bg-slate-100 text-slate-700"><AlertCircle className="w-3 h-3 mr-1" /> Skipped</Badge>;
            default: return null;
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10">
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
                            value={selectedDate || ""}
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
                                                {/* If delivery exists and has items, show them. Otherwise show sub items */}
                                                {(item.delivery?.items && item.delivery.items.length > 0 ? item.delivery.items : sub.items).map((p: any) => (
                                                    <div key={p.variant_id || p.id} className="text-sm flex justify-between">
                                                        <span className="text-slate-600">{p.variant_name}</span>
                                                        <span className="font-medium">{p.quantity} {p.unit || ''}</span>
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
                                        <div className="bg-slate-50/50 p-4 shrink-0 flex flex-row md:flex-col justify-end md:justify-center items-center gap-2 md:w-44">
                                            {isPending ? (
                                                <>
                                                    <Button size="sm" className="w-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white" 
                                                        disabled={actionLoading === sub.id}
                                                        onClick={() => handleRecord(sub.id, "delivered")}
                                                    >
                                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                                        Delivered
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="w-full text-xs text-primary border-primary/30 hover:bg-primary/5" 
                                                        disabled={actionLoading === sub.id}
                                                        onClick={() => openAdjustModal(item)}
                                                    >
                                                        <Settings2 className="w-3.5 h-3.5 mr-1" />
                                                        Adjust Items
                                                    </Button>
                                                    <div className="flex gap-2 w-full mt-1">
                                                        <Button size="sm" variant="ghost" className="flex-1 text-xs h-7 text-red-600 hover:text-red-700 hover:bg-red-50" 
                                                            disabled={actionLoading === sub.id}
                                                            onClick={() => handleRecord(sub.id, "failed")}
                                                        >
                                                            Failed
                                                        </Button>
                                                        <Button size="sm" variant="ghost" className="flex-1 text-xs h-7"
                                                            disabled={actionLoading === sub.id}
                                                            onClick={() => handleRecord(sub.id, "skipped")}
                                                        >
                                                            Skip
                                                        </Button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-center w-full">
                                                    <Button size="sm" variant="ghost" className="text-xs w-full" onClick={() => openAdjustModal(item)}>
                                                        View/Edit
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Adjust & Deliver Modal */}
            <Dialog open={adjustModalOpen} onOpenChange={setAdjustModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Delivery Items for {adjustingSub?.subscription.customer_name}</DialogTitle>
                    </DialogHeader>
                    
                    <div className="py-4 space-y-4">
                        <div className="space-y-3">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Items to Deliver</Label>
                            {adjustedItems.map((item, idx) => (
                                <div key={item.variant_id} className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border">
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">{item.variant_name}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input 
                                            type="number" 
                                            value={item.quantity || 0} 
                                            onChange={(e) => updateItemQuantity(item.variant_id, parseFloat(e.target.value) || 0)}
                                            className="w-20 h-8 text-center"
                                        />
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeItem(item.variant_id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-4 border-t space-y-3">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Add Extra Product</Label>
                            <div className="flex gap-2">
                                <select 
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            addNewItem(e.target.value);
                                            e.target.value = "";
                                        }
                                    }}
                                >
                                    <option value="">Select a product...</option>
                                    {allVariants.map(v => (
                                        <option key={v.id} value={v.id}>{v.name} (₹{v.selling_price})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAdjustModalOpen(false)}>Cancel</Button>
                        <Button 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white" 
                            disabled={actionLoading !== null || adjustedItems.length === 0}
                            onClick={() => handleRecord(adjustingSub!.subscription.id, "delivered", adjustedItems.map(i => ({ variant_id: i.variant_id, quantity: i.quantity })))}
                        >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                            Confirm & Deliver
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
