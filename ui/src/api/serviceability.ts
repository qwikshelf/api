import axios from "./axios";
import type { ApiResponse, DeliveryZone, ServiceableAreaResponse } from "@/types";

export const serviceabilityApi = {
    // Zones
    listZones: (warehouseId?: number) => axios.get<ApiResponse<DeliveryZone[]>>("/serviceability/zones", {
        params: { warehouse_id: warehouseId }
    }),
    createZone: (data: Partial<DeliveryZone>) => axios.post<ApiResponse<DeliveryZone>>("/serviceability/zones", data),
    updateZone: (id: number, data: Partial<DeliveryZone>) => axios.put<ApiResponse<DeliveryZone>>(`/serviceability/zones/${id}`, data),

    // Mapping
    mapPincode: (data: { pincode: string; zone_id: number }) => axios.post<ApiResponse<null>>("/serviceability/map", data),

    // Import
    importPincodes: (zoneId: number, file: File) => {
        const formData = new FormData();
        formData.append("zone_id", zoneId.toString());
        formData.append("file", file);
        return axios.post<ApiResponse<null>>("/serviceability/import", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
    },

    // GeoData
    listGeoData: () => axios.get<ApiResponse<any[]>>("/serviceability/geodata"),

    // Public / Check
    checkServiceability: (pincode: string) => axios.get<ApiResponse<ServiceableAreaResponse>>(`/public/serviceability?pincode=${pincode}`),
};
