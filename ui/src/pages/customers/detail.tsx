import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Receipt, Package, Calendar, Phone, Mail, Building, Landmark, Hash, AlertCircle, Loader2 } from "lucide-react";
import { customerApi } from "@/api/customers";
import { salesApi } from "@/api/sales";
import type { CustomerResponse } from "@/types";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function CustomerDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [customer, setCustomer] = useState<CustomerResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [salesPage, setSalesPage] = useState(1);
    const [salesData, setSalesData] = useState<any[]>([]);
    const [salesLoading, setSalesLoading] = useState(false);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        customerApi.get(parseInt(id))
            .then(res => setCustomer(res.data.data))
            .catch(() => {
                toast.error("Failed to load customer details");
                navigate("/customers");
            })
            .finally(() => setLoading(false));
    }, [id, navigate]);

    useEffect(() => {
        if (!id) return;
        setSalesLoading(true);
        // Include customer_id filter that we added to salesApi
        salesApi.getHistory(salesPage, 20, undefined, undefined, undefined, parseInt(id))
            .then(res => {
                setSalesData(res.data.data || []);
                setTotalPages(res.data.meta?.total_pages || 1);
            })
            .catch(() => toast.error("Failed to load sales history"))
            .finally(() => setSalesLoading(false));
    }, [id, salesPage]);

    // Aggregate Product Consumption exactly like standard D2C/CRM behaviour
    const productFootprint = useMemo(() => {
        const productMap = new Map<number, { name: string, qty: number, revenue: number, variants: number }>();
        
        salesData.forEach(sale => {
            if (!sale.items) return;
            sale.items.forEach((item: any) => {
                const existing = productMap.get(item.variant_id) || { name: item.variant_name || "Unknown Product", qty: 0, revenue: 0, variants: 1 };
                existing.qty += parseFloat(item.quantity) || 0;
                existing.revenue += parseFloat(item.line_total) || 0;
                productMap.set(item.variant_id, existing);
            });
        });

        // Convert to array and sort by quantity descending
        return Array.from(productMap.values()).sort((a, b) => b.qty - a.qty);
    }, [salesData]);

    if (loading || !customer) return <div className="h-96 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

    const termsColor = customer.payment_terms === "cash" ? "bg-green-100 text-green-800" 
        : customer.payment_terms === "prepaid" ? "bg-blue-100 text-blue-800" 
        : "bg-amber-100 text-amber-800";

    const salesColumns: Column<any>[] = [
        { header: "Date", accessorKey: "created_at", cell: (row) => format(new Date(row.created_at), "dd MMM yyyy HH:mm") },
        { header: "Total Amount", accessorKey: "total_amount", cell: (row) => `₹${parseFloat(row.total_amount).toFixed(2)}` },
        { header: "Payment", accessorKey: "payment_method", className: "capitalize" },
        { header: "Tax", accessorKey: "tax_amount", cell: (row) => `₹${parseFloat(row.tax_amount).toFixed(2)}` },
        { header: "Warehouse", accessorKey: "warehouse_name" },
    ];

    const productColumns: Column<any>[] = [
        { header: "Product Variant", accessorKey: "name", className: "font-medium" },
        { header: "Total Quantity Consumed", accessorKey: "qty" },
        { header: "Total Lifetime Revenue", accessorKey: "revenue", cell: (row) => `₹${row.revenue.toFixed(2)}` },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate("/customers")}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{customer.name}</h1>
                    <div className="flex items-center gap-3 mt-1">
                        <Badge variant="outline" className="capitalize">{customer.customer_category}</Badge>
                        <Badge variant="secondary" className={termsColor}>
                            {customer.payment_terms.replace("_", " ")}
                        </Badge>
                        {customer.zone_name && (
                            <span className="text-xs text-muted-foreground flex items-center">
                                <MapPin className="h-3 w-3 mr-1" /> {customer.zone_name}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Profile Details</CardTitle>
                        <CardDescription>Contact, CRM and organizational metrics</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                        <div>
                            <span className="text-muted-foreground flex items-center gap-2 mb-1"><Phone className="h-4 w-4"/> Phone</span>
                            <p className="font-medium">{customer.phone}</p>
                        </div>
                        <div>
                            <span className="text-muted-foreground flex items-center gap-2 mb-1"><Mail className="h-4 w-4"/> Email</span>
                            <p className="font-medium">{customer.email || "-"}</p>
                        </div>
                        <div>
                            <span className="text-muted-foreground flex items-center gap-2 mb-1"><Building className="h-4 w-4"/> Physical Address</span>
                            <p className="font-medium">{customer.address || "-"}</p>
                        </div>
                        <div>
                            <span className="text-muted-foreground flex items-center gap-2 mb-1"><MapPin className="h-4 w-4"/> Delivery Route</span>
                            <p className="font-medium">{customer.delivery_route || "-"}</p>
                        </div>
                        <div>
                            <span className="text-muted-foreground flex items-center gap-2 mb-1"><Landmark className="h-4 w-4"/> GST Number</span>
                            <p className="font-medium uppercase">{customer.gst_number || "-"}</p>
                        </div>
                        <div>
                            <span className="text-muted-foreground flex items-center gap-2 mb-1"><Calendar className="h-4 w-4"/> Customer Since</span>
                            <p className="font-medium">{format(new Date(customer.created_at), "dd MMM yyyy")}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-50 border-slate-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Financial Position</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1">
                            <span className="text-sm text-muted-foreground">Authorized Credit Limit</span>
                            <div className="text-2xl font-bold font-mono tracking-tight text-blue-700">
                                ₹{customer.credit_limit.toLocaleString()}
                            </div>
                        </div>
                        <div className="space-y-1 pt-4 border-t">
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <Hash className="h-4 w-4" /> Internal Notes
                            </span>
                            <p className="text-sm italic mt-1 text-slate-600 bg-white p-2 rounded border border-slate-100 min-h-[4rem]">
                                {customer.internal_notes || "No special instructions recorded for this operative."}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="billing" className="w-full mt-8">
                <TabsList className="mb-4">
                    <TabsTrigger value="billing" className="flex gap-2"><Receipt className="h-4 w-4"/> Billing History</TabsTrigger>
                    <TabsTrigger value="products" className="flex gap-2"><Package className="h-4 w-4"/> Product Footprint</TabsTrigger>
                </TabsList>
                
                <TabsContent value="billing" className="space-y-4">
                    <div className="bg-white border rounded-lg shadow-sm">
                        <DataTable
                            columns={salesColumns}
                            data={salesData}
                            loading={salesLoading}
                            page={salesPage}
                            totalPages={totalPages}
                            onPageChange={setSalesPage}
                            onRowClick={(row) => navigate(`/sales/history?search=${row.id}`)}
                        />
                    </div>
                </TabsContent>
                <TabsContent value="products">
                    <div className="bg-white border rounded-lg shadow-sm">
                        {productFootprint.length > 0 ? (
                            <DataTable columns={productColumns} data={productFootprint} />
                        ) : (
                            <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                                <AlertCircle className="h-8 w-8 text-slate-300 mb-2" />
                                <p>No products consumed yet based on loaded history.</p>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
