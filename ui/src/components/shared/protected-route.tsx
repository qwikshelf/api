import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const accessToken = useAuthStore((s) => s.accessToken);
    const user = useAuthStore((s) => s.user);

    if (!accessToken) return <Navigate to="/login" replace />;

    // Block customers from admin dashboard
    if (user?.role?.name === "customer") {
        return <Navigate to="/login" replace state={{ error: "Customers cannot access the admin dashboard" }} />;
    }

    return <>{children}</>;
}
