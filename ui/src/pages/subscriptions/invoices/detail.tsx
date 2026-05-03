import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
    ChevronLeft, 
    Printer, 
    CheckCircle2, 
    AlertCircle, 
    Plus,
    Calendar,
    User,
    FileText,
    Receipt
} from "lucide-react";
import { subscriptionsApi } from "@/api/subscriptions";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function InvoiceDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [invoice, setInvoice] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    // Adjustment Form
    const [adjType, setAdjType] = useState("credit");
    const [adjAmount, setAdjAmount] = useState("");
    const [adjReason, setAdjReason] = useState("");
    const [submittingAdj, setSubmittingAdj] = useState(false);
    const [isAdjOpen, setIsAdjOpen] = useState(false);

    const load = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const res = await subscriptionsApi.getInvoice(parseInt(id));
            setInvoice(res.data.data);
        } catch {
            toast.error("Failed to load invoice details");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    const handleFinalize = async () => {
        if (!id) return;
        try {
            await subscriptionsApi.finalizeInvoice(parseInt(id));
            toast.success("Invoice finalized");
            load();
        } catch {
            toast.error("Failed to finalize invoice");
        }
    };

    const handleAddAdjustment = async () => {
        if (!id || !adjAmount || !adjReason) return;
        setSubmittingAdj(true);
        try {
            await subscriptionsApi.addAdjustment(parseInt(id), {
                type: adjType,
                amount: parseFloat(adjAmount),
                reason: adjReason
            });
            toast.success("Adjustment added successfully");
            setIsAdjOpen(false);
            setAdjAmount("");
            setAdjReason("");
            load();
        } catch {
            toast.error("Failed to add adjustment");
        } finally {
            setSubmittingAdj(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading Invoice # {id}...</div>;
    if (!invoice) return <div className="p-8 text-center text-red-500">Invoice not found</div>;

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate("/subscriptions/invoices")}>
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight">Invoice #{invoice.id}</h1>
                        <Badge variant={invoice.status === "paid" ? "default" : "secondary"} className="capitalize">
                            {invoice.status}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground">Period: {format(new Date(invoice.billing_period_start), "MMM d")} - {format(new Date(invoice.billing_period_end), "MMM d, yyyy")}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => window.print()}>
                        <Printer className="h-4 w-4 mr-2" /> Print
                    </Button>
                    {invoice.status === "draft" && (
                        <Button onClick={handleFinalize} className="bg-emerald-600 hover:bg-emerald-700">
                            <CheckCircle2 className="h-4 w-4 mr-2" /> Finalize Bill
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Summary & Items */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-none shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50/50">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Receipt className="h-5 w-5 text-slate-500" /> Delivery Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50/30 border-b border-slate-100">
                                    <tr>
                                        <th className="text-left px-6 py-3 font-medium text-slate-500">Description</th>
                                        <th className="text-center px-6 py-3 font-medium text-slate-500">Total Qty</th>
                                        <th className="text-right px-6 py-3 font-medium text-slate-500">Unit Price</th>
                                        <th className="text-right px-6 py-3 font-medium text-slate-500">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {invoice.items?.map((item: any) => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">Variant #{item.variant_id}</td>
                                            <td className="px-6 py-4 text-center font-medium">{item.total_quantity}</td>
                                            <td className="px-6 py-4 text-right text-muted-foreground">₹{item.unit_price}</td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-900">₹{item.subtotal}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>

                    {invoice.adjustments?.length > 0 && (
                        <Card className="border-none shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2 text-slate-700">
                                    <AlertCircle className="h-5 w-5 text-amber-500" /> Adjustments & Credits
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {invoice.adjustments.map((adj: any) => (
                                    <div key={adj.id} className="flex items-start justify-between p-3 rounded-lg bg-slate-50/50 border border-slate-100">
                                        <div>
                                            <div className="font-semibold text-slate-900">{adj.reason}</div>
                                            <div className="text-xs text-muted-foreground">{format(new Date(adj.created_at), "MMM d, h:mm a")}</div>
                                        </div>
                                        <div className={`font-bold ${adj.type === 'credit' ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {adj.type === 'credit' ? '-' : '+'} ₹{adj.amount}
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right: Customer & Financials */}
                <div className="space-y-6">
                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg">Billing Info</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-3">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Customer</div>
                                    <div className="font-medium text-slate-900 capitalize">{invoice.customer_name || "Active Customer"}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Due Date</div>
                                    <div className="font-medium text-slate-900">{format(new Date(invoice.due_date), "MMMM d, yyyy")}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Subscription</div>
                                    <div className="font-medium text-slate-900"># {invoice.subscription_id}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-slate-900 text-white">
                        <CardHeader>
                            <CardTitle className="text-lg text-slate-300">Financial Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Base Amount</span>
                                <span>₹{invoice.base_amount}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Adjustments</span>
                                <span className={Number(invoice.adjustment_amount) < 0 ? "text-emerald-400" : "text-white"}>
                                    {Number(invoice.adjustment_amount) < 0 ? "" : "+"} ₹{invoice.adjustment_amount}
                                </span>
                            </div>
                            <Separator className="bg-slate-800" />
                            <div className="flex justify-between items-baseline pt-2">
                                <span className="font-bold">Total Due</span>
                                <span className="text-2xl font-bold text-emerald-400">₹{invoice.total_amount}</span>
                            </div>

                            {invoice.status === "draft" && (
                                <Dialog open={isAdjOpen} onOpenChange={setIsAdjOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="w-full bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800">
                                            <Plus className="h-4 w-4 mr-2" /> Add Adjustment
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[425px]">
                                        <DialogHeader>
                                            <DialogTitle>Add Invoice Adjustment</DialogTitle>
                                            <DialogDescription>
                                                Apply a credit or debit for this billing cycle. This will update the total amount.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-4">
                                            <div className="grid grid-cols-4 items-center gap-4">
                                                <Label htmlFor="type" className="text-right">Type</Label>
                                                <select 
                                                    id="type"
                                                    className="col-span-3 h-9 px-3 border rounded-md"
                                                    value={adjType}
                                                    onChange={(e) => setAdjType(e.target.value)}
                                                >
                                                    <option value="credit">Credit (Discount)</option>
                                                    <option value="debit">Debit (Extra Charge)</option>
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-4 items-center gap-4">
                                                <Label htmlFor="amount" className="text-right">Amount (₹)</Label>
                                                <Input id="amount" type="number" className="col-span-3" value={adjAmount} onChange={(e) => setAdjAmount(e.target.value)} />
                                            </div>
                                            <div className="grid grid-cols-4 items-center gap-4">
                                                <Label htmlFor="reason" className="text-right">Reason</Label>
                                                <Input id="reason" className="col-span-3" placeholder="e.g. Refund for damaged items" value={adjReason} onChange={(e) => setAdjReason(e.target.value)} />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setIsAdjOpen(false)}>Cancel</Button>
                                            <Button onClick={handleAddAdjustment} disabled={submittingAdj}>
                                                {submittingAdj ? "Adding..." : "Apply Adjustment"}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
