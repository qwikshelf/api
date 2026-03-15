import { useState, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "sonner";
import { serviceabilityApi } from "@/api/serviceability";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, CheckCircle2, XCircle } from "lucide-react";
import L from "leaflet";
import type { ServiceableAreaResponse } from "@/types";

// Fix Leaflet icon issues in React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

function MapResizer({ center, zoom }: { center: [number, number], zoom: number }) {
    const map = useMap();
    useEffect(() => {
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
    }, [map]);

    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);

    return null;
}

export default function ServiceabilityMapPage() {
    const [geoData, setGeoData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchPincode, setSearchPincode] = useState("520010");
    const [searchResult, setSearchResult] = useState<ServiceableAreaResponse | null>(null);
    const [searching, setSearching] = useState(false);
    const [mapCenter, setMapCenter] = useState<[number, number]>([28.6139, 77.2090]);
    const [mapZoom, setMapZoom] = useState(11);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await serviceabilityApi.listGeoData();
                setGeoData(res.data.data || []);
                
                // Automatically search for default pincode after map data is ready
                if (searchPincode) {
                    performSearch(searchPincode);
                }
            } catch {
                toast.error("Failed to load map data");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const performSearch = async (pincode: string) => {
        if (!pincode.trim()) return;
        setSearching(true);
        try {
            const res = await serviceabilityApi.checkServiceability(pincode);
            if (res.data.success && res.data.data) {
                const area = res.data.data;
                setSearchResult(area);
                
                if (area.geo_data && area.geo_data.center) {
                    try {
                        let centerData = area.geo_data.center;
                        if (centerData.startsWith('{') || centerData.startsWith('[')) {
                            const center = JSON.parse(centerData);
                            if (center.type === "Point") {
                                const [lng, lat] = center.coordinates;
                                setMapCenter([lat, lng]);
                                setMapZoom(13);
                            }
                        }
                    } catch (e) {
                        console.error("Failed to parse center coordinates", e);
                    }
                }
                if (pincode !== "520010") {
                    toast.success(`Pincode ${pincode} is serviceable in ${area.zone_name}`);
                }
            } else if (pincode !== "520010") {
                toast.error(`Pincode ${pincode} is not serviceable`);
            }
        } catch {
            if (pincode !== "520010") {
                toast.error("Error checking serviceability");
            }
        } finally {
            setSearching(false);
        }
    };

    const handleSearch = () => performSearch(searchPincode);

    // Convert our backend model to GeoJSON FeatureCollection for Leaflet
    const featureCollection = {
        type: "FeatureCollection",
        features: geoData.map((item) => {
            try {
                const boundary = item.boundary;
                if (!boundary || (!boundary.startsWith('{') && !boundary.startsWith('['))) {
                    return null;
                }
                return {
                    type: "Feature",
                    properties: { ...item.metadata, pincode: item.pincode },
                    geometry: JSON.parse(boundary),
                };
            } catch {
                return null;
            }
        }).filter(Boolean),
    };

    const onEachFeature = (feature: any, layer: any) => {
        if (feature.properties && feature.properties.pincode) {
            layer.bindPopup(`
                <div class="p-2">
                    <h3 class="font-bold text-lg">Pincode: ${feature.properties.pincode}</h3>
                    <p class="text-sm">${feature.properties.Office_Name || ""}</p>
                    <hr class="my-2" />
                    <p class="text-xs text-muted-foreground">Zone: ${feature.properties.zone_name || "Unassigned"}</p>
                </div>
            `);
        }
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <PageHeader 
                title="Serviceability Map" 
                description="Visual overview of delivery boundaries and pincode coverage" 
            />

            <Card className="flex-1 min-h-[600px] overflow-hidden">
                <CardContent className="p-0 h-full relative">
                    {loading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/20 gap-4">
                            <Skeleton className="h-[500px] w-full" />
                            <p className="text-muted-foreground animate-pulse">Loading spatial data...</p>
                        </div>
                    ) : (
                        <>
                            <div className="absolute top-4 left-4 z-[1000] w-80 space-y-2">
                                <Card className="shadow-lg border-2">
                                    <CardContent className="p-3 space-y-3">
                                        <div className="flex gap-2">
                                            <Input 
                                                placeholder="Enter Pincode..." 
                                                value={searchPincode} 
                                                onChange={(e) => setSearchPincode(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                                className="h-9"
                                            />
                                            <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleSearch} disabled={searching}>
                                                <Search className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        {searchResult && (
                                            <div className={`p-3 rounded-lg border flex items-start gap-3 ${searchResult.zone_id ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                                {searchResult.zone_id ? (
                                                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                                                ) : (
                                                    <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                                                )}
                                                <div className="space-y-1">
                                                    <p className="text-sm font-semibold">
                                                        {searchResult.zone_id ? "Serviceable Area" : "Non-Serviceable"}
                                                    </p>
                                                    {searchResult.zone_id && (
                                                        <>
                                                            <p className="text-xs font-medium text-green-800">{searchResult.zone_name}</p>
                                                            <p className="text-[10px] text-green-700">Delivery: {searchResult.estimated_delivery_text}</p>
                                                            <p className="text-[10px] text-green-700">Charge: ₹{searchResult.delivery_charge}</p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                            <MapContainer 
                                center={mapCenter} 
                                zoom={mapZoom} 
                                style={{ height: "600px", width: "100%" }}
                            >
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                <GeoJSON 
                                    data={featureCollection as any} 
                                    onEachFeature={onEachFeature}
                                    style={{
                                        color: "#3b82f6",
                                        weight: 2,
                                        opacity: 0.6,
                                        fillColor: "#3b82f6",
                                        fillOpacity: 0.2
                                    }}
                                />
                                {searchResult?.geo_data?.boundary && (searchResult.geo_data.boundary.startsWith('{') || searchResult.geo_data.boundary.startsWith('[')) && (
                                    <GeoJSON 
                                        key={`search-${searchResult.pincode}`}
                                        data={JSON.parse(searchResult.geo_data.boundary)}
                                        style={{
                                            color: "#16a34a",
                                            weight: 4,
                                            opacity: 0.8,
                                            fillColor: "#16a34a",
                                            fillOpacity: 0.4
                                        }}
                                    />
                                )}
                                <MapResizer center={mapCenter} zoom={mapZoom} />
                            </MapContainer>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
