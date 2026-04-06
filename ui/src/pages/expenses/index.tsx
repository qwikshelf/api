import { useState, useEffect } from "react";
import { Plus, Trash2, Filter, Receipt, Calendar, Building2, User } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
    getExpenses,
    createExpense,
    deleteExpense,
    getExpenseCategories,
} from "@/api/expenses";
import type { Expense, ExpenseCategory, ExpenseFilter } from "@/api/expenses";
import { warehousesApi } from "@/api/warehouses";
import type { WarehouseResponse } from "@/types";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddOpen, setIsAddOpen] = useState(false);
    
    // Filters
    const [filter, setFilter] = useState<ExpenseFilter>({
        category_id: undefined,
        warehouse_id: undefined,
        start_date: "",
        end_date: "",
    });

    // New Expense State
    const [newExpense, setNewExpense] = useState({
        category_id: 0,
        amount: 0,
        description: "",
        date: format(new Date(), "yyyy-MM-dd"),
        warehouse_id: undefined as number | undefined,
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [expenseData, catData, whData] = await Promise.all([
                getExpenses(filter),
                getExpenseCategories(),
                warehousesApi.list()
            ]);
            setExpenses(expenseData.data || []);
            setCategories(catData || []);
            setWarehouses(whData.data.data || []);
        } catch (err) {
            toast.error("Failed to load expense data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filter]);

    const handleAdd = async () => {
        if (newExpense.category_id === 0 || newExpense.amount <= 0) {
            toast.error("Please fill in category and valid amount");
            return;
        }
        try {
            const payload = {
                ...newExpense,
                date: new Date(newExpense.date).toISOString()
            };
            await createExpense(payload);
            toast.success("Expense recorded successfully");
            setIsAddOpen(false);
            setNewExpense({
                category_id: 0,
                amount: 0,
                description: "",
                date: format(new Date(), "yyyy-MM-dd"),
                warehouse_id: undefined,
            });
            fetchData();
        } catch (err) {
            toast.error("Failed to record expense");
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await deleteExpense(id);
            toast.success("Expense deleted");
            fetchData();
        } catch (err) {
            toast.error("Failed to delete expense");
        }
    };

    const totalAmount = (expenses || []).reduce((sum, exp) => sum + exp.amount, 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
                    <p className="text-muted-foreground font-medium">
                        Monitor and track all business expenditures in one place.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 shadow-sm">
                                <Plus className="h-4 w-4" />
                                Record Expense
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle>Record Business Expense</DialogTitle>
                                <DialogDescription>
                                    Enter details for the new business expenditure.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-6 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="category">Category</Label>
                                        <Select 
                                            onValueChange={(val) => setNewExpense({ ...newExpense, category_id: parseInt(val) })}
                                        >
                                            <SelectTrigger id="category">
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {categories.map(cat => (
                                                    <SelectItem key={cat.id} value={cat.id.toString()}>
                                                        {cat.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="amount">Amount (PKR)</Label>
                                        <Input
                                            id="amount"
                                            type="number"
                                            placeholder="0.00"
                                            value={newExpense.amount || ""}
                                            onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="date">Date</Label>
                                        <Input
                                            id="date"
                                            type="date"
                                            value={newExpense.date}
                                            onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="warehouse">Warehouse (Optional)</Label>
                                        <Select 
                                            onValueChange={(val) => setNewExpense({ ...newExpense, warehouse_id: parseInt(val) })}
                                        >
                                            <SelectTrigger id="warehouse">
                                                <SelectValue placeholder="Global" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {warehouses.map(wh => (
                                                    <SelectItem key={wh.id} value={wh.id.toString()}>
                                                        {wh.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="desc">Description</Label>
                                    <Textarea
                                        id="desc"
                                        placeholder="What was this expense for?"
                                        value={newExpense.description}
                                        onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleAdd}>
                                    Save Record
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Metrics Section */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-primary/5 border-primary/10">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Period Expense</CardTitle>
                        <Receipt className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Rs. {totalAmount.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">Based on current filters</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Unique Categories</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{new Set(expenses.map(e => e.category_id)).size}</div>
                        <p className="text-xs text-muted-foreground mt-1">Active in this period</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Records</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{expenses.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">Transactions recorded</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters Bar */}
            <Card className="p-4 flex flex-wrap items-center gap-4 bg-muted/20 border-none ring-1 ring-border shadow-sm">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Filters:</span>
                </div>
                
                <Select onValueChange={(val) => setFilter({ ...filter, category_id: val === "all" ? undefined : parseInt(val) })}>
                    <SelectTrigger className="w-[180px] h-9">
                        <SelectValue placeholder="Category: All" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Category: All</SelectItem>
                        {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select onValueChange={(val) => setFilter({ ...filter, warehouse_id: val === "all" ? undefined : parseInt(val) })}>
                    <SelectTrigger className="w-[180px] h-9">
                        <SelectValue placeholder="Warehouse: All" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Warehouse: All</SelectItem>
                        {warehouses.map(wh => (
                            <SelectItem key={wh.id} value={wh.id.toString()}>{wh.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                    <Input 
                        type="date" 
                        className="w-auto h-9" 
                        onChange={(e) => setFilter({ ...filter, start_date: e.target.value })}
                    />
                    <span className="text-muted-foreground text-sm">to</span>
                    <Input 
                        type="date" 
                        className="w-auto h-9" 
                        onChange={(e) => setFilter({ ...filter, end_date: e.target.value })}
                    />
                </div>
            </Card>

            {/* List Table */}
            <Card className="rounded-xl overflow-hidden border-none shadow-sm ring-1 ring-border/50">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>Recorded By</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-12">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-muted-foreground text-sm">Loading expenses...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : expenses.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-20">
                                    <Receipt className="h-10 w-10 text-muted/30 mx-auto mb-3" />
                                    <p className="text-lg font-medium text-muted-foreground">No expenses found</p>
                                    <p className="text-sm text-muted-foreground/60">Try adjusting your filters or record a new expense.</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            expenses.map((exp) => (
                                <TableRow key={exp.id} className="hover:bg-muted/10 transition-colors group">
                                    <TableCell className="font-medium">
                                        {format(new Date(exp.date), "MMM dd, yyyy")}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="bg-primary/5 text-primary-foreground/80 border-primary/20">
                                            {exp.category_name}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate" title={exp.description}>
                                        {exp.description || "—"}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                            <Building2 className="h-3 w-3" />
                                            {exp.warehouse_name || "Global"}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <User className="h-3 w-3" />
                                            {exp.recorded_by_username}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-base">
                                        Rs. {exp.amount.toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/50 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will permanently delete this expense record. This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction 
                                                        className="bg-destructive hover:bg-destructive/90"
                                                        onClick={() => handleDelete(exp.id)}
                                                    >
                                                        Delete Record
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
