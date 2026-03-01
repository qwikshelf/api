import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CartItem {
    id: number;
    name: string;
    price: number;
    quantity: number;
    image?: string;
    unit: string;
}

interface CartStore {
    items: CartItem[];
    addItem: (item: CartItem) => void;
    removeItem: (id: number) => void;
    updateQuantity: (id: number, quantity: number) => void;
    clearCart: () => void;
    getTotal: () => number;
}

export const useCart = create<CartStore>()(
    persist(
        (set, get) => ({
            items: [],
            addItem: (item) => {
                const currentItems = get().items;
                const existingItem = currentItems.find((i) => i.id === item.id);
                if (existingItem) {
                    set({
                        items: currentItems.map((i) =>
                            i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
                        ),
                    });
                } else {
                    set({ items: [...currentItems, item] });
                }
            },
            removeItem: (id) =>
                set({ items: get().items.filter((i) => i.id !== id) }),
            updateQuantity: (id, quantity) => {
                if (quantity <= 0) {
                    get().removeItem(id);
                } else {
                    set({
                        items: get().items.map((i) =>
                            i.id === id ? { ...i, quantity } : i
                        ),
                    });
                }
            },
            clearCart: () => set({ items: [] }),
            getTotal: () =>
                get().items.reduce((acc, item) => acc + item.price * item.quantity, 0),
        }),
        {
            name: "qwikshelf-cart",
        }
    )
);
