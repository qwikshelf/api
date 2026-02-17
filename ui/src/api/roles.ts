import api from "./axios";
import type { ApiResponse, RoleResponse, CreateRoleRequest, UpdateRoleRequest, PermissionResponse } from "@/types";

export const rolesApi = {
    list: () =>
        api.get<ApiResponse<RoleResponse[]>>("/roles"),

    get: (id: number) =>
        api.get<ApiResponse<RoleResponse>>(`/roles/${id}`),

    create: (data: CreateRoleRequest) =>
        api.post<ApiResponse<RoleResponse>>("/roles", data),

    update: (id: number, data: UpdateRoleRequest) =>
        api.put<ApiResponse<RoleResponse>>(`/roles/${id}`, data),

    delete: (id: number) =>
        api.delete(`/roles/${id}`),
};

export const permissionsApi = {
    list: () =>
        api.get<ApiResponse<PermissionResponse[]>>("/permissions"),
};
