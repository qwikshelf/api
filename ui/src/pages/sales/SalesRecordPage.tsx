import { useState, useEffect } from "react";
import {
    Calendar as CalendarIcon,
    Eye,
    Download,
    Warehouse,
    TrendingUp,
    IndianRupee,
    CreditCard,
    FileText
} from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { salesApi } from "@/api/sales";
import { warehousesApi } from "@/api/warehouses";
import type { SaleResponse, WarehouseResponse } from "@/types";

export default function SalesHistoryPage() {
    const [sales, setSales] = useState<SaleResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
    const [dateFilter, setDateFilter] = useState<string>(format(new Date(), "yyyy-MM-dd"));
    const [selectedSale, setSelectedSale] = useState<SaleResponse | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    useEffect(() => {
        fetchWarehouses();
    }, []);

    useEffect(() => {
        fetchSales();
    }, [selectedWarehouse, dateFilter]);

    const fetchWarehouses = async () => {
        try {
            const resp = await warehousesApi.list();
            setWarehouses(resp.data.data || []);
        } catch (error) {
            toast.error("Failed to fetch warehouses");
        }
    };

    const fetchSales = async () => {
        setLoading(true);
        try {
            const start = dateFilter ? startOfDay(new Date(dateFilter)).toISOString() : undefined;
            const end = dateFilter ? endOfDay(new Date(dateFilter)).toISOString() : undefined;
            const warehouseId = selectedWarehouse === "all" ? undefined : parseInt(selectedWarehouse);

            const resp = await salesApi.getHistory(1, 100, warehouseId, start, end);
            setSales(resp.data.data || []);
        } catch (error) {
            toast.error("Failed to fetch sales history");
        } finally {
            setLoading(false);
        }
    };

    const viewDetails = async (id: number) => {
        try {
            const resp = await salesApi.getById(id);
            setSelectedSale(resp.data.data);
            setIsDetailsOpen(true);
        } catch (error) {
            toast.error("Failed to fetch sale details");
        }
    };

    const totals = sales.reduce((acc, sale) => ({
        subtotal: acc.subtotal + (Number(sale.total_amount) - Number(sale.tax_amount)),
        tax: acc.tax + Number(sale.tax_amount),
        total: acc.total + Number(sale.total_amount)
    }), { subtotal: 0, tax: 0, total: 0 });

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Sales History</h1>
                    <p className="text-muted-foreground">Track and analyze your daily transactions</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => fetchSales()}>
                        <TrendingUp className="mr-2 h-4 w-4" /> Refresh
                    </Button>
                    <Button>
                        <Download className="mr-2 h-4 w-4" /> Export
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Daily Revenue</CardTitle>
                        <IndianRupee className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-primary">₹{totals.total.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Gross total for selected filters</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{sales.length}</div>
                        <p className="text-xs text-muted-foreground">Successful sales orders</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tax Collected</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{totals.tax.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Total tax amount</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 space-y-1.5">
                            <label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Date</label>
                            <div className="relative">
                                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="date"
                                    className="pl-9"
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="w-64 space-y-1.5">
                            <label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Warehouse</label>
                            <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                                <SelectTrigger>
                                    <div className="flex items-center gap-2">
                                        <Warehouse className="h-4 w-4" />
                                        <SelectValue placeholder="All Warehouses" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Warehouses</SelectItem>
                                    {warehouses.map(w => (
                                        <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Sales Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-[100px]">ID</TableHead>
                                <TableHead>Date & Time</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Warehouse</TableHead>
                                <TableHead>Payment</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-center">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">Loading history...</TableCell>
                                </TableRow>
                            ) : sales.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">No transactions found for this period</TableCell>
                                </TableRow>
                            ) : (
                                sales.map((sale) => (
                                    <TableRow key={sale.id} className="hover:bg-muted/30">
                                        <TableCell className="font-mono text-xs">#S-{sale.id}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">{format(new Date(sale.created_at), "dd MMM yyyy")}</span>
                                                <span className="text-xs text-muted-foreground">{format(new Date(sale.created_at), "hh:mm aa")}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                                    {sale.customer_name ? sale.customer_name.charAt(0).toUpperCase() : "C"}
                                                </div>
                                                <span className="text-sm">{sale.customer_name || "Walk-in Customer"}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-normal">
                                                {sale.warehouse_name}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span className="text-xs capitalize">{sale.payment_method}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-sm">
                                            ₹{Number(sale.total_amount).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Button variant="ghost" size="icon" onClick={() => viewDetails(sale.id)}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Sale Details Dialog */}
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex justify-between items-center pr-6">
                            <span>Sale Details #S-{selectedSale?.id}</span>
                            <Badge variant="secondary">{selectedSale?.payment_method.toUpperCase()}</Badge>
                        </DialogTitle>
                        <DialogDescription>
                            Processed on {selectedSale && format(new Date(selectedSale.created_at), "PPP p")}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="p-3 bg-muted/50 rounded-lg">
                                <p className="text-muted-foreground text-xs mb-1">Customer</p>
                                <p className="font-semibold">{selectedSale?.customer_name || "Walk-in Customer"}</p>
                            </div>
                            <div className="p-3 bg-muted/50 rounded-lg">
                                <p className="text-muted-foreground text-xs mb-1">Warehouse</p>
                                <p className="font-semibold">{selectedSale?.warehouse_name}</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Order Items</p>
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted">
                                            <TableHead>Product</TableHead>
                                            <TableHead className="text-right">Qty</TableHead>
                                            <TableHead className="text-right">Price</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedSale?.items?.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <p className="font-medium text-sm">{item.variant_name}</p>
                                                    <p className="text-[10px] text-muted-foreground">{item.variant_sku}</p>
                                                </TableCell>
                                                <TableCell className="text-right">{item.quantity}</TableCell>
                                                <TableCell className="text-right">₹{Number(item.unit_price).toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-semibold">₹{Number(item.line_total).toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        <div className="space-y-2 border-t pt-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span>₹{(Number(selectedSale?.total_amount) - Number(selectedSale?.tax_amount)).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Tax</span>
                                <span>₹{Number(selectedSale?.tax_amount).toFixed(2)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between text-lg font-bold">
                                <span>Total Amount</span>
                                <span className="text-primary">₹{Number(selectedSale?.total_amount).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
