import api from "./axios";

export interface ExpenseCategory {
    id: number;
    name: string;
    description?: string;
}

export interface Expense {
    id: number;
    category_id: number;
    category_name?: string;
    amount: number;
    description?: string;
    date: string;
    recorded_by_user_id: number;
    recorded_by_username?: string;
    warehouse_id?: number | null;
    warehouse_name?: string;
    attachment_url?: string;
    created_at: string;
}

export interface ExpenseFilter {
    category_id?: number;
    warehouse_id?: number;
    user_id?: number;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
}

export const getExpenses = async (params?: ExpenseFilter) => {
    const { data } = await api.get<{ data: Expense[]; total: number }>("/expenses", { params });
    return data;
};

export const createExpense = async (expense: Partial<Expense>) => {
    const { data } = await api.post<Expense>("/expenses", expense);
    return data;
};

export const deleteExpense = async (id: number) => {
    await api.delete(`/expenses/${id}`);
};

export const getExpenseCategories = async () => {
    const { data } = await api.get<ExpenseCategory[]>("/expenses/categories");
    return data;
};

export const createExpenseCategory = async (category: Partial<ExpenseCategory>) => {
    const { data } = await api.post<ExpenseCategory>("/expenses/categories", category);
    return data;
};
