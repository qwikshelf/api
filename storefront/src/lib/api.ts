import axios from "axios";

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1",
    headers: {
        "Content-Type": "application/json",
    },
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
    (config) => {
        if (typeof window !== "undefined") {
            const authStorage = localStorage.getItem("qwikshelf-auth");
            if (authStorage) {
                try {
                    const { state } = JSON.parse(authStorage);
                    if (state.accessToken) {
                        config.headers.Authorization = `Bearer ${state.accessToken}`;
                    }
                } catch (e) {
                    console.error("Failed to parse auth storage", e);
                }
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
