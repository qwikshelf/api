import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PlusCircle, Trash2, Loader2, Package } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { subscriptionsApi } from "@/api/subscriptions";
import { productsApi } from "@/api/products";
import type { ProductVariantResponse } from "@/types";
import type {
    SubscriptionResponse,
    CreateSubscriptionRequest,
    SubscriptionFrequency,
} from "@/types/subscription";

const itemSchema = z.object({
    variant_id: z.number().min(1, "Please select a product"),
    quantity: z.number().positive("Must be greater than 0"),
});

const formSchema = z.object({
    frequency: z.enum(["daily", "alternate_days", "weekly", "monthly"] as const),
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().optional(),
    delivery_instructions: z.string().optional(),
    items: z.array(itemSchema).min(1, "At least one product is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface SubscriptionFormModalProps {
    open: boolean;
    onClose: () => void;
    onSaved: () => void;
    customerId: number;
    editSubscription?: SubscriptionResponse | null;
}

const FREQUENCY_LABELS: Record<SubscriptionFrequency, string> = {
    daily: "Daily",
    alternate_days: "Alternate Days",
    weekly: "Weekly",
    monthly: "Monthly",
};

export function SubscriptionFormModal({
    open,
    onClose,
    onSaved,
    customerId,
    editSubscription,
}: SubscriptionFormModalProps) {
    const isEditing = !!editSubscription;
    const [products, setProducts] = useState<ProductVariantResponse[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);

    const { register, handleSubmit, control, setValue, watch, reset, formState: { errors, isSubmitting } } =
        useForm<FormValues>({
            resolver: zodResolver(formSchema),
            defaultValues: {
                frequency: "daily",
                start_date: new Date().toISOString().split("T")[0],
                items: [{ variant_id: 0, quantity: 1 }],
            },
        });

    const { fields, append, remove } = useFieldArray({ control, name: "items" });

    // Load all products for the dropdown
    useEffect(() => {
        if (!open) return;
        setLoadingProducts(true);
        productsApi.list(1, 200)
            .then(res => setProducts(res.data.data || []))
            .catch(() => toast.error("Failed to load products"))
            .finally(() => setLoadingProducts(false));
    }, [open]);

    // Populate form when editing
    useEffect(() => {
        if (editSubscription) {
            reset({
                frequency: editSubscription.frequency,
                start_date: editSubscription.start_date.split("T")[0],
                end_date: editSubscription.end_date?.split("T")[0] ?? "",
                delivery_instructions: editSubscription.delivery_instructions ?? "",
                items: editSubscription.items.map(i => ({
                    variant_id: i.variant_id,
                    quantity: i.quantity,
                })),
            });
        } else {
            reset({
                frequency: "daily",
                start_date: new Date().toISOString().split("T")[0],
                items: [{ variant_id: 0, quantity: 1 }],
            });
        }
    }, [editSubscription, reset, open]);

    const onSubmit = async (values: FormValues) => {
        try {
            if (isEditing && editSubscription) {
                await subscriptionsApi.update(editSubscription.id, {
                    frequency: values.frequency,
                    start_date: values.start_date,
                    end_date: values.end_date || undefined,
                    delivery_instructions: values.delivery_instructions || undefined,
                    items: values.items,
                });
                toast.success("Subscription updated successfully");
            } else {
                const payload: CreateSubscriptionRequest = {
                    customer_id: customerId,
                    frequency: values.frequency,
                    start_date: values.start_date,
                    end_date: values.end_date || undefined,
                    delivery_instructions: values.delivery_instructions || undefined,
                    items: values.items,
                };
                await subscriptionsApi.create(payload);
                toast.success("Subscription created successfully");
            }
            onSaved();
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to save subscription");
        }
    };

    const watchedItems = watch("items");

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        {isEditing ? "Edit Subscription" : "New Subscription"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-2">
                    {/* Frequency + Start Date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Delivery Frequency</Label>
                            <Select
                                value={watch("frequency")}
                                onValueChange={(v) => setValue("frequency", v as SubscriptionFrequency)}
                            >
                                <SelectTrigger className={errors.frequency ? "border-destructive" : ""}>
                                    <SelectValue placeholder="Select frequency" />
                                </SelectTrigger>
                                <SelectContent>
                                    {(Object.entries(FREQUENCY_LABELS) as [SubscriptionFrequency, string][]).map(([val, label]) => (
                                        <SelectItem key={val} value={val}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.frequency && <p className="text-xs text-destructive">{errors.frequency.message}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <Label>Start Date</Label>
                            <Input type="date" {...register("start_date")} className={errors.start_date ? "border-destructive" : ""} />
                            {errors.start_date && <p className="text-xs text-destructive">{errors.start_date.message}</p>}
                        </div>
                    </div>

                    {/* End Date */}
                    <div className="space-y-1.5">
                        <Label>End Date <span className="text-muted-foreground text-xs">(optional — leave blank for open-ended)</span></Label>
                        <Input type="date" {...register("end_date")} />
                    </div>

                    {/* Delivery Instructions */}
                    <div className="space-y-1.5">
                        <Label>Delivery Instructions <span className="text-muted-foreground text-xs">(optional)</span></Label>
                        <Textarea
                            {...register("delivery_instructions")}
                            placeholder="e.g. Leave in the porch cooler, ring doorbell twice"
                            rows={2}
                        />
                    </div>

                    {/* Product Items */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Products &amp; Quantities</Label>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-primary h-8 px-2"
                                onClick={() => append({ variant_id: 0, quantity: 1 })}
                            >
                                <PlusCircle className="h-4 w-4 mr-1" /> Add Product
                            </Button>
                        </div>

                        {errors.items?.root && (
                            <p className="text-xs text-destructive">{errors.items.root.message}</p>
                        )}

                        <div className="space-y-2 rounded-lg border bg-slate-50 p-3">
                            {loadingProducts ? (
                                <div className="flex items-center justify-center py-4 text-muted-foreground text-sm gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Loading products...
                                </div>
                            ) : (
                                fields.map((field, index) => (
                                    <div key={field.id} className="flex gap-2 items-start">
                                        {/* Product Select */}
                                        <div className="flex-1">
                                            <Select
                                                value={watchedItems[index]?.variant_id?.toString() || ""}
                                                onValueChange={(v) => setValue(`items.${index}.variant_id`, parseInt(v))}
                                            >
                                                <SelectTrigger className={`bg-white ${errors.items?.[index]?.variant_id ? "border-destructive" : ""}`}>
                                                    <SelectValue placeholder="Select product variant..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {products.map(p => (
                                                        <SelectItem key={p.id} value={p.id.toString()}>
                                                            <span className="font-medium">{p.name}</span>
                                                            <span className="text-muted-foreground ml-2 text-xs">{p.family_name} · {p.unit}</span>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors.items?.[index]?.variant_id && (
                                                <p className="text-xs text-destructive mt-0.5">{errors.items[index]?.variant_id?.message}</p>
                                            )}
                                        </div>

                                        {/* Quantity */}
                                        <div className="w-28">
                                            <Input
                                                type="number"
                                                step="0.001"
                                                min="0.001"
                                                placeholder="Qty"
                                                className={`bg-white text-right ${errors.items?.[index]?.quantity ? "border-destructive" : ""}`}
                                                {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                                            />
                                            {errors.items?.[index]?.quantity && (
                                                <p className="text-xs text-destructive mt-0.5">{errors.items[index]?.quantity?.message}</p>
                                            )}
                                        </div>

                                        {/* Delete row */}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:text-destructive shrink-0"
                                            onClick={() => fields.length > 1 && remove(index)}
                                            disabled={fields.length === 1}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            {isEditing ? "Save Changes" : "Create Subscription"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
