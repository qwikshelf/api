import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ServiceableArea {
    pincode: string;
    warehouse_id: number | null;
    is_active: boolean;
    min_order_amount: number;
    delivery_charge: number;
    estimated_delivery_text: string;
}

interface LocationStore {
    pincode: string | null;
    locationData: ServiceableArea | null;
    isServiceable: boolean;
    setLocation: (pincode: string, data: ServiceableArea | null) => void;
    clearLocation: () => void;
}

export const useLocation = create<LocationStore>()(
    persist(
        (set) => ({
            pincode: null,
            locationData: null,
            isServiceable: false,
            setLocation: (pincode, data) => {
                set({
                    pincode,
                    locationData: data,
                    isServiceable: !!data && data.is_active,
                });
            },
            clearLocation: () =>
                set({
                    pincode: null,
                    locationData: null,
                    isServiceable: false,
                }),
        }),
        {
            name: "qwikshelf-location",
        }
    )
);
