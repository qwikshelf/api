import axios from "axios";
import { useAuthStore } from "@/stores/auth-store";

const api = axios.create({
    baseURL: "/api/v1",
    headers: { "Content-Type": "application/json" },
});

// Inject JWT token into every request
api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 → logout
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            useAuthStore.getState().logout();
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);

export default api;
