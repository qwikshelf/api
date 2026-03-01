export interface PublicCategory {
    id: number;
    name: string;
}

export interface PublicProduct {
    id: number;
    family_id: number;
    family_name?: string;
    name: string;
    sku: string;
    unit: string;
    selling_price: string; // decimal.Decimal comes as string in JSON
    conversion_factor: string;
    description?: string;
    category_name?: string;
    image?: string; // Optional for now
}

export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        page: number;
        per_page: number;
        total: number;
        total_pages: number;
    };
    message: string;
}
