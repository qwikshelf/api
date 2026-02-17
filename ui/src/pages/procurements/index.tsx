import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Eye } from "lucide-react";
import { procurementsApi } from "@/api/procurements";
import type { ProcurementResponse } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STATUS_COLORS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    draft: "outline",
    approved: "secondary",
    ordered: "default",
    received: "default",
    cancelled: "destructive",
};

export default function ProcurementsPage() {
    const navigate = useNavigate();
    const [data, setData] = useState<ProcurementResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await procurementsApi.list(page, 20);
            setData(res.data.data || []);
            setTotalPages(res.data.meta?.total_pages || 1);
        } catch { toast.error("Failed to load procurements"); }
        finally { setLoading(false); }
    }, [page]);

    useEffect(() => { load(); }, [load]);

    const columns: Column<ProcurementResponse>[] = [
        {
            header: "PO #",
            className: "w-20",
            cell: (row) => <span className="font-mono font-medium">#{row.id}</span>,
        },
        {
            header: "Supplier",
            cell: (row) => row.supplier_name || `Supplier #${row.supplier_id}`,
            accessorKey: "supplier_name",
        },
        {
            header: "Warehouse",
            cell: (row) => <Badge variant="secondary">{row.warehouse_name || `#${row.warehouse_id}`}</Badge>,
        },
        {
            header: "Status",
            cell: (row) => (
                <Badge variant={STATUS_COLORS[row.status] || "outline"} className="capitalize">
                    {row.status}
                </Badge>
            ),
        },
        {
            header: "Total",
            className: "w-28 text-right",
            cell: (row) => <span className="font-medium">₹{row.total_cost}</span>,
        },
        {
            header: "Expected",
            className: "w-28",
            cell: (row) => row.expected_delivery
                ? new Date(row.expected_delivery).toLocaleDateString()
                : <span className="text-muted-foreground">—</span>,
        },
        {
            header: "Created",
            className: "w-28",
            cell: (row) => new Date(row.created_at).toLocaleDateString(),
        },
        {
            header: "",
            className: "w-16 text-right",
            cell: (row) => (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); navigate(`/procurements/${row.id}`); }}>
                    <Eye className="h-4 w-4" />
                </Button>
            ),
        },
    ];

    return (
        <div>
            <PageHeader title="Procurements" description="Manage purchase orders">
                <Button onClick={() => navigate("/procurements/new")}><Plus className="mr-2 h-4 w-4" />New PO</Button>
            </PageHeader>

            <DataTable
                columns={columns}
                data={data}
                loading={loading}
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                onRowClick={(row) => navigate(`/procurements/${row.id}`)}
                searchPlaceholder="Search purchase orders..."
            />
        </div>
    );
}
