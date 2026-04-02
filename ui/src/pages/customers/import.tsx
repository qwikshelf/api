import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Papa from "papaparse";
import { ArrowLeft, UploadCloud, FileType, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { customerApi } from "@/api/customers";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CustomerResponse } from "@/types";

export default function CustomerImportPage() {
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<any[]>([]);
    
    // Status
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{total: number, success: number, failed: number, errors: any[]} | null>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (!selected) return;
        
        setFile(selected);
        setResult(null);

        Papa.parse(selected, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const mappedData = results.data.map((row: any) => ({
                    name: row["Name"] || row["name"] || "",
                    phone: row["Phone"] || row["phone"] || "",
                    email: row["Email"] || row["email"] || "",
                    address: row["Address"] || row["address"] || "",
                    gst_number: row["GST"] || row["gst_number"] || row["GST Number"] || "",
                    credit_limit: parseFloat(row["Credit Limit"] || row["credit_limit"]) || 0,
                    payment_terms: (row["Payment Terms"] || row["payment_terms"] || "cash").toLowerCase(),
                    customer_category: (row["Category"] || row["customer_category"] || "retail").toLowerCase(),
                    delivery_route: row["Delivery Route"] || row["delivery_route"] || "",
                    zone_id: parseInt(row["Zone ID"] || row["zone_id"]) || undefined,
                    internal_notes: row["Notes"] || row["internal_notes"] || "",
                })).filter(r => r.name && r.phone); // Require core fields
                
                setPreview(mappedData);
            },
            error: () => {
                toast.error("Failed to parse CSV file");
            }
        });
    };

    const submitImport = async () => {
        if (preview.length === 0) return;
        setSubmitting(true);
        try {
            const res = await customerApi.createBulk(preview as Partial<CustomerResponse>[]);
            setResult(res.data.data);
            if (res.data.data.failed > 0) {
                toast.warning(`Imported ${res.data.data.success}, but ${res.data.data.failed} failed.`);
            } else {
                toast.success(`Successfully imported all ${res.data.data.success} customers!`);
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Critical error during batch import");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10">
            <PageHeader 
                title="Bulk Customer Import" 
                description="Upload a CSV spreadsheet to add multiple customers into the CRM at once."
            >
                <Button variant="outline" onClick={() => navigate("/customers")}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to CRM
                </Button>
            </PageHeader>

            {/* Template Instructions */}
            <Card className="bg-slate-50/50">
                <CardContent className="pt-6">
                    <h3 className="font-semibold text-sm mb-2">CSV Formatting Rules</h3>
                    <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                        <li>Required Columns: <strong>Name</strong>, <strong>Phone</strong></li>
                        <li>Optional Columns: <strong>Email</strong>, <strong>Address</strong>, <strong>GST</strong>, <strong>Credit Limit</strong>, <strong>Payment Terms</strong> (cash, prepaid, net_15, net_30), <strong>Category</strong> (retail, wholesale, b2b), <strong>Zone ID</strong>, <strong>Delivery Route</strong></li>
                        <li>Phones must be strictly unique. Duplicates will register as a "Failed" row but will not interrupt the rest of the batch.</li>
                    </ul>
                </CardContent>
            </Card>

            {/* Upload Zone */}
            {!result && (
                <Card className="border-dashed border-2 bg-slate-50/30">
                    <CardContent className="h-48 flex flex-col items-center justify-center pt-6">
                        <UploadCloud className="h-10 w-10 text-muted-foreground mb-4" />
                        <label className="cursor-pointer">
                            <span className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 font-medium text-sm transition-colors">
                                Browse CSV File
                            </span>
                            <input 
                                type="file" 
                                className="hidden" 
                                accept=".csv" 
                                onChange={handleFileUpload} 
                            />
                        </label>
                        {file && <p className="mt-4 text-sm text-slate-600 font-medium">{file.name} ({preview.length} valid rows detected)</p>}
                    </CardContent>
                </Card>
            )}

            {/* Results Panel */}
            {result && (
                <Card className={result.failed > 0 ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}>
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                            {result.failed > 0 ? <AlertCircle className="h-8 w-8 text-amber-600 mt-1" /> : <CheckCircle2 className="h-8 w-8 text-emerald-600 mt-1" />}
                            <div className="flex-1">
                                <h3 className="font-semibold text-lg border-b pb-2 mb-3">Import Complete</h3>
                                <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
                                    <div className="bg-white rounded-lg p-3 border shadow-sm">
                                        <div className="text-muted-foreground mb-1">Total Processed</div>
                                        <div className="text-2xl font-bold">{result.total}</div>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 border shadow-sm border-emerald-100">
                                        <div className="text-emerald-600 mb-1">Successfully Created</div>
                                        <div className="text-2xl font-bold">{result.success}</div>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 border shadow-sm border-amber-100">
                                        <div className="text-amber-600 mb-1">Failed to Create</div>
                                        <div className="text-2xl font-bold">{result.failed}</div>
                                    </div>
                                </div>
                                
                                {result.errors && result.errors.length > 0 && (
                                    <div className="bg-white rounded-lg border text-sm max-h-60 overflow-y-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50 border-b sticky top-0">
                                                <tr>
                                                    <th className="py-2 px-4 font-medium">Row #</th>
                                                    <th className="py-2 px-4 font-medium">Error Message</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {result.errors.map((e, idx) => (
                                                    <tr key={idx} className="border-b last:border-0 hover:bg-slate-50">
                                                        <td className="py-2 px-4 font-mono text-slate-500">{e.row}</td>
                                                        <td className="py-2 px-4 text-red-600">{e.message}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                <div className="mt-6 flex justify-end gap-3">
                                    <Button variant="outline" onClick={() => setResult(null)}>Import Another</Button>
                                    <Button onClick={() => navigate("/customers")}>View CRM Roster</Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Preview Verification Table */}
            {preview.length > 0 && !result && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold px-1 flex items-center gap-2">
                            <FileType className="h-4 w-4" /> Data Preview ({preview.length} extracted)
                        </h3>
                        <Button onClick={submitImport} disabled={submitting}>
                            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Batch Creating...</> : "Execute Bulk Import"}
                        </Button>
                    </div>

                    <div className="border rounded-md overflow-hidden bg-white">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 border-b">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Name</th>
                                    <th className="px-4 py-3 font-medium">Phone</th>
                                    <th className="px-4 py-3 font-medium">Payment Terms</th>
                                    <th className="px-4 py-3 font-medium">Delivery Route</th>
                                    <th className="px-4 py-3 font-medium">Zone ID</th>
                                </tr>
                            </thead>
                            <tbody>
                                {preview.slice(0, 10).map((row, idx) => (
                                    <tr key={idx} className="border-b last:border-0 hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium text-slate-800">{row.name}</td>
                                        <td className="px-4 py-3 tabular-nums">{row.phone}</td>
                                        <td className="px-4 py-3 capitalize">{row.payment_terms}</td>
                                        <td className="px-4 py-3 text-slate-600">{row.delivery_route || "-"}</td>
                                        <td className="px-4 py-3 text-slate-600">{row.zone_id || "-"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {preview.length > 10 && (
                            <div className="px-4 py-3 text-center text-xs text-muted-foreground bg-slate-50 border-t">
                                + {preview.length - 10} more rows not shown in preview
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
