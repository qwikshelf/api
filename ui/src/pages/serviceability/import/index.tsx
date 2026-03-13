import { useState, useEffect } from "react";
import { toast } from "sonner";
import { UploadCloud, FileJson, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { serviceabilityApi } from "@/api/serviceability";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { DeliveryZone } from "@/types";

export default function PincodeImportPage() {
    const [zones, setZones] = useState<DeliveryZone[]>([]);
    const [selectedZone, setSelectedZone] = useState<string>("");
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [zonesLoading, setZonesLoading] = useState(true);

    useEffect(() => {
        const loadZones = async () => {
            try {
                const res = await serviceabilityApi.listZones();
                setZones(res.data.data || []);
            } catch (err) {
                toast.error("Failed to load delivery zones");
            } finally {
                setZonesLoading(false);
            }
        };
        loadZones();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleImport = async () => {
        if (!file || !selectedZone) return;

        setLoading(true);
        try {
            await serviceabilityApi.importPincodes(parseInt(selectedZone), file);
            toast.success("Pincode data imported successfully");
            setFile(null);
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to import pincodes");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Pincode Import" 
                description="Upload GeoJSON or CSV data to seed pincode boundaries and mapping" 
            />

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Import Panel</CardTitle>
                        <CardDescription>
                            Select a target zone and upload your spatial data file.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Target Delivery Zone</Label>
                            <Select 
                                value={selectedZone} 
                                onValueChange={setSelectedZone}
                                disabled={zonesLoading}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={zonesLoading ? "Loading zones..." : "Select a zone"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {zones.map((zone) => (
                                        <SelectItem key={zone.id} value={zone.id.toString()}>
                                            {zone.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>GeoJSON File</Label>
                            <label 
                                className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                                    file ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:bg-muted/50"
                                }`}
                            >
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    {file ? (
                                        <FileJson className="w-10 h-10 mb-3 text-primary" />
                                    ) : (
                                        <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                                    )}
                                    <p className="mb-2 text-sm text-muted-foreground">
                                        <span className="font-semibold">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="text-xs text-muted-foreground/60">
                                        {file ? file.name : "GeoJSON (Max 10MB)"}
                                    </p>
                                </div>
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    accept=".json,.geojson" 
                                    onChange={handleFileChange}
                                />
                            </label>
                        </div>

                        <Button 
                            className="w-full" 
                            disabled={!file || !selectedZone || loading}
                            onClick={handleImport}
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? "Importing Data..." : "Start Import"}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Instructions</CardTitle>
                        <CardDescription>How to prepare your data for import</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-3">
                            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                            <div className="text-sm">
                                <p className="font-medium">GeoJSON Format</p>
                                <p className="text-muted-foreground">The file must be a FeatureCollection where each feature has a "Pincode" property.</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                            <div className="text-sm">
                                <p className="font-medium">Coordinate System</p>
                                <p className="text-muted-foreground">Use WGS84 (EPSG:4326) for best compatibility with mobile/web maps.</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                            <div className="text-sm">
                                <p className="font-medium">Zone Allocation</p>
                                <p className="text-muted-foreground">Pincodes will be automatically mapped to the selected zone. Existing mappings will be updated.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
