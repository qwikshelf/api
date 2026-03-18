import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Fix Leaflet icon issues in React
if (typeof window !== "undefined") {
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    });
}

interface MapPickerProps {
    value: { lat: number; lng: number } | null;
    onChange: (value: { lat: number; lng: number }) => void;
    height?: string;
}

function LocationMarker({ position, setPosition }: { position: L.LatLng | null, setPosition: (pos: L.LatLng) => void }) {
    useMapEvents({
        click(e) {
            setPosition(e.latlng);
        },
    });

    return position === null ? null : (
        <Marker 
            position={position} 
            draggable={true}
            eventHandlers={{
                dragend: (e) => {
                    setPosition(e.target.getLatLng());
                },
            }}
        />
    );
}

function MapResizer({ center }: { center: [number, number] | null }) {
    const map = useMap();
    useEffect(() => {
        // Fix for container size changes
        setTimeout(() => map.invalidateSize(), 100);
    }, [map]);

    useEffect(() => {
        if (center) {
            map.flyTo(center, map.getZoom() < 10 ? 15 : map.getZoom());
        }
    }, [center, map]);

    return null;
}

export function MapPicker({ value, onChange, height = "250px" }: MapPickerProps) {
    const [position, setPosition] = useState<L.LatLng | null>(
        value?.lat && value?.lng ? L.latLng(value.lat, value.lng) : null
    );
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (value?.lat && value?.lng) {
            setPosition(L.latLng(value.lat, value.lng));
        } else {
            setPosition(null);
        }
    }, [value?.lat, value?.lng]);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setSearching(true);
        setShowResults(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=in&limit=5`);
            const data = await res.json();
            setSearchResults(data);
        } catch (error) {
            console.error("Geocoding error:", error);
        } finally {
            setSearching(false);
        }
    };

    const selectResult = (result: any) => {
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        const pos = L.latLng(lat, lng);
        handleSetPosition(pos);
        setSearchQuery(result.display_name);
        setShowResults(false);
    };

    const handleSetPosition = (pos: L.LatLng) => {
        setPosition(pos);
        onChange({ lat: pos.lat, lng: pos.lng });
    };

    const initialCenter: [number, number] = value?.lat && value?.lng 
        ? [value.lat, value.lng] 
        : [28.6139, 77.2090]; // Default to Delhi, India if no value

    return (
        <div 
            className="relative w-full rounded-lg overflow-hidden border border-border shadow-sm group transition-all"
            style={{ height }}
        >
            {/* Search Overlay */}
            <div ref={searchRef} className="absolute top-2 left-2 right-2 z-[1000] flex flex-col gap-1">
                <div className="relative flex gap-1">
                    <Input
                        className="bg-background/95 backdrop-blur-sm h-9 pr-8 shadow-md border-primary/20 focus-visible:ring-1"
                        placeholder="Search for a place or farm name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    {searchQuery && (
                        <button 
                            className="absolute right-12 top-2.5 text-muted-foreground hover:text-foreground"
                            onClick={() => { setSearchQuery(""); setShowResults(false); }}
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                    <Button 
                        size="icon" 
                        variant="default" 
                        className="h-9 w-9 shrink-0 shadow-md"
                        onClick={handleSearch}
                        disabled={searching}
                    >
                        {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                </div>

                {showResults && searchResults.length > 0 && (
                    <div className="bg-background border rounded-md shadow-xl max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200">
                        {searchResults.map((result, idx) => (
                            <button
                                key={idx}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors border-b last:border-0"
                                onClick={() => selectResult(result)}
                            >
                                <p className="font-medium truncate">{result.display_name.split(',')[0]}</p>
                                <p className="text-xs text-muted-foreground truncate">{result.display_name}</p>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <MapContainer 
                center={initialCenter} 
                zoom={value?.lat ? 15 : 12} 
                scrollWheelZoom={true} 
                style={{ height: "100%", width: "100%", zIndex: 0 }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationMarker position={position} setPosition={handleSetPosition} />
                <MapResizer center={value?.lat && value?.lng ? [value.lat, value.lng] : null} />
            </MapContainer>
            
            {!position && (
                <div className="absolute inset-0 bg-background/20 backdrop-blur-[1px] flex items-center justify-center pointer-events-none z-10">
                    <div className="bg-background/90 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg border border-border animate-bounce">
                        Click on map to pick location
                    </div>
                </div>
            )}
            
            <div className="absolute top-2 right-2 bg-background/90 p-1.5 rounded-md text-[10px] font-mono shadow-sm border border-border z-10 pointer-events-none">
                {position ? `${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}` : "No location"}
            </div>
        </div>
    );
}
