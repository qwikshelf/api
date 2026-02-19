import { useState, useEffect } from "react";
import {
    Plus,
    ClipboardList,
    User,
    Package,
    Warehouse,
    Weight,
    Truck,
    Clock
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { productsApi } from "@/api/products";
import { warehousesApi } from "@/api/warehouses";
import { suppliersApi } from "@/api/suppliers";
import { collectionsApi } from "@/api/collections";
import type {
    ProductVariantResponse,
    WarehouseResponse,
    SupplierResponse,
    CollectionResponse
} from "@/types";

export default function CollectionPage() {
    const [collections, setCollections] = useState<CollectionResponse[]>([]);
    const [products, setProducts] = useState<ProductVariantResponse[]>([]);
    const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
    const [suppliers, setSuppliers] = useState<SupplierResponse[]>([]);

    // Form state
    const [selectedVariantId, setSelectedVariantId] = useState<string>("");
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
    const [recordedWeight, setRecordedWeight] = useState<string>("");
    const [notes, setNotes] = useState<string>("");
    const [recordedAt, setRecordedAt] = useState<string>(new Date().toISOString().slice(0, 16));

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        fetchInitialData();
        fetchCollections();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [pResp, wResp, sResp] = await Promise.all([
                productsApi.list(1, 100),
                warehousesApi.list(),
                suppliersApi.list(1, 100)
            ]);
            setProducts(pResp.data.data || []);
            setWarehouses(wResp.data.data || []);
            setSuppliers(sResp.data.data || []);

            // Set default warehouse to Main Store if exists
            const mainStore = wResp.data.data?.find(w => w.name.toLowerCase().includes("main"));
            if (mainStore) {
                setSelectedWarehouseId(mainStore.id.toString());
            } else if (wResp.data.data?.[0]) {
                setSelectedWarehouseId(wResp.data.data[0].id.toString());
            }
        } catch (error) {
            toast.error("Failed to fetch initial data");
        }
    };

    const fetchCollections = async () => {
        try {
            const resp = await collectionsApi.list();
            setCollections(resp.data.data || []);
        } catch (error) {
            toast.error("Failed to fetch collections");
        }
    };

    const handleRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedVariantId || !selectedSupplierId || !selectedWarehouseId || !recordedWeight) {
            toast.error("Please fill in all required fields");
            return;
        }

        setIsSubmitting(true);
        try {
            await collectionsApi.record({
                variant_id: parseInt(selectedVariantId),
                supplier_id: parseInt(selectedSupplierId),
                warehouse_id: parseInt(selectedWarehouseId),
                weight: parseFloat(recordedWeight),
                collected_at: new Date(recordedAt).toISOString(),
                notes: notes
            });
            toast.success("Collection recorded successfully!");
            setIsDialogOpen(false);
            resetForm();
            fetchCollections();
        } catch (error: any) {
            const msg = error.response?.data?.error?.message || "Failed to record collection";
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setSelectedVariantId("");
        setSelectedSupplierId("");
        setRecordedWeight("");
        setNotes("");
        setRecordedAt(new Date().toISOString().slice(0, 16));
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Product Collections</h1>
                    <p className="text-muted-foreground">Manage agent collections and product intake.</p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" /> New Collection
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Record Collection</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleRecord} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Product Variant</label>
                                <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select product" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {products.map(p => (
                                            <SelectItem key={p.id} value={p.id.toString()}>{p.name} ({p.sku})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Supplier</label>
                                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select supplier" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {suppliers.map(s => (
                                            <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Weight ({products.find(p => p.id.toString() === selectedVariantId)?.unit || "kg"})</label>
                                    <div className="relative">
                                        <Weight className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="number"
                                            step="0.001"
                                            placeholder="0.000"
                                            className="pl-9"
                                            value={recordedWeight}
                                            onChange={(e) => setRecordedWeight(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Warehouse</label>
                                    <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select warehouse" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {warehouses.map(w => (
                                                <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Collection Date & Time</label>
                                <Input
                                    type="datetime-local"
                                    value={recordedAt}
                                    onChange={(e) => setRecordedAt(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Notes</label>
                                <Textarea
                                    placeholder="Any additional details..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </div>

                            <DialogFooter>
                                <Button type="submit" disabled={isSubmitting} className="w-full">
                                    {isSubmitting ? "Recording..." : "Record Collection"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <ClipboardList className="h-5 w-5 text-primary" />
                            Recent Collections
                        </CardTitle>
                        <CardDescription>View and track products collected from suppliers.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date & Time</TableHead>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Weight</TableHead>
                                    <TableHead>Supplier</TableHead>
                                    <TableHead>Agent</TableHead>
                                    <TableHead>Warehouse</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {collections.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            No collections recorded yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    collections.map((col) => (
                                        <TableRow key={col.id}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{format(new Date(col.collected_at), "dd MMM yyyy")}</span>
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Clock className="h-3 w-3" /> {format(new Date(col.collected_at), "hh:mm a")}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Package className="h-4 w-4 text-muted-foreground" />
                                                    {col.variant_name}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-bold text-primary">
                                                {col.weight} {products.find(p => p.id === col.variant_id)?.unit || "kg"}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Truck className="h-4 w-4 text-muted-foreground" />
                                                    {col.supplier_name}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-muted-foreground" />
                                                    {col.agent_name}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                                    <Warehouse className="h-3 w-3" />
                                                    {warehouses.find(w => w.id === col.warehouse_id)?.name || "Warehouse"}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
