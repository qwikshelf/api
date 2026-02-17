import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Phone, MapPin } from "lucide-react";
import { suppliersApi } from "@/api/suppliers";
import { productsApi } from "@/api/products";
import type { SupplierResponse, SupplierVariantResponse, ProductVariantResponse } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function SupplierDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const supplierId = Number(id);

    const [supplier, setSupplier] = useState<SupplierResponse | null>(null);
    const [variants, setVariants] = useState<SupplierVariantResponse[]>([]);
    const [allProducts, setAllProducts] = useState<ProductVariantResponse[]>([]);
    const [loadingSup, setLoadingSup] = useState(true);
    const [loadingVars, setLoadingVars] = useState(true);
    const [addOpen, setAddOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState<SupplierVariantResponse | null>(null);
    const [addForm, setAddForm] = useState({ variant_id: 0, agreed_cost: "", is_preferred: false });
    const [saving, setSaving] = useState(false);

    const loadSupplier = useCallback(async () => {
        setLoadingSup(true);
        try {
            const res = await suppliersApi.get(supplierId);
            setSupplier(res.data.data);
        } catch { toast.error("Failed to load supplier"); navigate("/suppliers"); }
        finally { setLoadingSup(false); }
    }, [supplierId, navigate]);

    const loadVariants = useCallback(async () => {
        setLoadingVars(true);
        try {
            const res = await suppliersApi.listVariants(supplierId);
            setVariants(res.data.data || []);
        } catch { toast.error("Failed to load variants"); }
        finally { setLoadingVars(false); }
    }, [supplierId]);

    const loadProducts = useCallback(async () => {
        try {
            const res = await productsApi.list(1, 200);
            setAllProducts(res.data.data || []);
        } catch { /* silent */ }
    }, []);

    useEffect(() => { loadSupplier(); }, [loadSupplier]);
    useEffect(() => { loadVariants(); }, [loadVariants]);
    useEffect(() => { loadProducts(); }, [loadProducts]);

    const handleAddVariant = async () => {
        if (!addForm.variant_id || !addForm.agreed_cost) return;
        setSaving(true);
        try {
            await suppliersApi.addVariant(supplierId, addForm);
            toast.success("Variant linked to supplier");
            setAddOpen(false);
            loadVariants();
        } catch { toast.error("Failed to add variant"); }
        finally { setSaving(false); }
    };

    const handleRemoveVariant = async () => {
        if (!deleting) return;
        setSaving(true);
        try {
            await suppliersApi.removeVariant(supplierId, deleting.variant_id);
            toast.success("Variant unlinked");
            setDeleteOpen(false);
            setDeleting(null);
            loadVariants();
        } catch { toast.error("Failed to remove variant"); }
        finally { setSaving(false); }
    };

    const openAdd = () => {
        setAddForm({ variant_id: 0, agreed_cost: "", is_preferred: false });
        setAddOpen(true);
    };

    // Filter out already-linked variants
    const availableProducts = allProducts.filter(
        (p) => !variants.some((v) => v.variant_id === p.id)
    );

    const variantColumns: Column<SupplierVariantResponse>[] = [
        {
            header: "Product",
            cell: (row) => (
                <div>
                    <p className="font-medium">{row.variant?.name || `Variant #${row.variant_id}`}</p>
                    <p className="text-xs text-muted-foreground font-mono">{row.variant?.sku}</p>
                </div>
            ),
        },
        { header: "Unit", cell: (row) => <Badge variant="outline">{row.variant?.unit || "—"}</Badge>, className: "w-24" },
        { header: "Agreed Cost", cell: (row) => `₹${row.agreed_cost}`, className: "w-32 text-right" },
        {
            header: "Preferred",
            className: "w-24",
            cell: (row) => row.is_preferred
                ? <Badge>Preferred</Badge>
                : <span className="text-muted-foreground text-sm">No</span>,
        },
        {
            header: "",
            className: "w-16 text-right",
            cell: (row) => (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeleting(row); setDeleteOpen(true); }}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            ),
        },
    ];

    return (
        <div>
            <div className="mb-6">
                <Button variant="ghost" size="sm" onClick={() => navigate("/suppliers")} className="mb-2 -ml-2">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Suppliers
                </Button>

                {loadingSup ? (
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-72" />
                    </div>
                ) : supplier ? (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h1 className="text-2xl font-bold">{supplier.name}</h1>
                                    <div className="flex items-center gap-4 mt-2 text-muted-foreground text-sm">
                                        {supplier.phone && (
                                            <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{supplier.phone}</span>
                                        )}
                                        {supplier.location && (
                                            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{supplier.location}</span>
                                        )}
                                    </div>
                                </div>
                                <Badge variant="secondary" className="text-sm">
                                    {variants.length} variant{variants.length !== 1 ? "s" : ""}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                ) : null}
            </div>

            <PageHeader title="Linked Products" description="Products supplied by this vendor">
                <Button onClick={openAdd} disabled={availableProducts.length === 0}>
                    <Plus className="mr-2 h-4 w-4" />Link Product
                </Button>
            </PageHeader>

            <DataTable columns={variantColumns} data={variants} loading={loadingVars} searchPlaceholder="Search linked products..." />

            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Link Product to Supplier</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Product Variant</Label>
                            <Select value={addForm.variant_id ? String(addForm.variant_id) : ""} onValueChange={(v) => setAddForm({ ...addForm, variant_id: Number(v) })}>
                                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                                <SelectContent>
                                    {availableProducts.map((p) => (
                                        <SelectItem key={p.id} value={String(p.id)}>
                                            {p.name} ({p.sku})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Agreed Cost (₹)</Label>
                            <Input type="number" step="0.01" value={addForm.agreed_cost} onChange={(e) => setAddForm({ ...addForm, agreed_cost: e.target.value })} placeholder="0.00" />
                        </div>
                        <div className="flex items-center gap-3">
                            <Switch checked={addForm.is_preferred} onCheckedChange={(v) => setAddForm({ ...addForm, is_preferred: v })} />
                            <Label>Preferred supplier for this product</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddVariant} disabled={saving || !addForm.variant_id || !addForm.agreed_cost}>
                            {saving ? "Linking..." : "Link Product"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title="Unlink Product"
                description={`Remove "${deleting?.variant?.name || "this variant"}" from this supplier?`}
                onConfirm={handleRemoveVariant}
                loading={saving}
            />
        </div>
    );
}
