import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    Users,
    Shield,
    Warehouse,
    Tags,
    FolderTree,
    Package,
    Truck,
    BoxesIcon,
    ShoppingCart,
    LogOut,
    ChevronLeft,
    CreditCard,
    ClipboardList,
    History,
    MapPin,
    UploadCloud,
    Map as MapIcon,
    UserSquare,
    CalendarDays,
    ListTodo,
    Receipt,
} from "lucide-react";
import logo from "@/assets/logo.png";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

const navItems = [
    { title: "Dashboard", icon: LayoutDashboard, href: "/", permission: "dashboard.view" },
    { title: "POS", icon: CreditCard, href: "/pos", permission: "sales.manage" },
    { title: "Customers", icon: UserSquare, href: "/customers", permission: "customers.view" },
    { title: "Daily Deliveries", icon: CalendarDays, href: "/deliveries", permission: "subscriptions.view" },
    { title: "Subscriptions", icon: ListTodo, href: "/subscriptions", permission: "subscriptions.view" },
    { title: "Users", icon: Users, href: "/users", permission: "users.view" },
    { title: "Roles", icon: Shield, href: "/roles", permission: "roles.view" },
    { title: "Warehouses", icon: Warehouse, href: "/warehouses", permission: "warehouses.view" },
    { title: "Categories", icon: Tags, href: "/categories", permission: "products.view" },
    { title: "Product Families", icon: FolderTree, href: "/product-families", permission: "products.view" },
    { title: "Products", icon: Package, href: "/products", permission: "products.view" },
    { title: "Suppliers", icon: Truck, href: "/suppliers", permission: "suppliers.view" },
    { title: "Inventory", icon: BoxesIcon, href: "/inventory", permission: "inventory.view" },
    { title: "Expenses", icon: Receipt, href: "/expenses", permission: "expenses.view" },
    { title: "Sales History", icon: History, href: "/sales/history", permission: "sales.view" },
    { title: "Collections", icon: ClipboardList, href: "/collections", permission: "collections.view" },
    { title: "Procurements", icon: ShoppingCart, href: "/procurements", permission: "procurement.view" },
    { title: "Delivery Zones", icon: MapPin, href: "/serviceability/zones", permission: "serviceability.manage" },
    { title: "Pincode Import", icon: UploadCloud, href: "/serviceability/import", permission: "serviceability.manage" },
    { title: "Serviceability Map", icon: MapIcon, href: "/serviceability/map", permission: "serviceability.manage" },
];

export function AppSidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout, user, hasPermission } = useAuthStore();
    const { toggleSidebar, open } = useSidebar();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="border-b border-sidebar-border">
                <div className="flex items-center gap-2 px-2 py-3">
                    <div className="flex h-10 w-fit items-center justify-center rounded-lg overflow-hidden">
                        <img src={logo} alt="QwikShelf" className="w-auto object-contain" />
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="ml-auto h-7 w-7"
                        onClick={toggleSidebar}
                    >
                        <ChevronLeft className={cn("h-4 w-4 transition-transform", !open && "rotate-180")} />
                    </Button>
                </div>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navItems.filter(item => {
                                if (!item.permission) return true;
                                return hasPermission(item.permission);
                            }).map((item) => (
                                <SidebarMenuItem key={item.href}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={
                                            item.href === "/"
                                                ? location.pathname === "/"
                                                : location.pathname.startsWith(item.href)
                                        }
                                        tooltip={item.title}
                                    >
                                        <Link to={item.href}>
                                            <item.icon className="h-4 w-4" />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <div className="flex items-center gap-2 px-2 py-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-medium">
                                {user?.username?.charAt(0).toUpperCase() ?? "U"}
                            </div>
                            {open && (
                                <div className="flex flex-col flex-1 min-w-0">
                                    <span className="text-sm font-medium truncate">{user?.username}</span>
                                    <span className="text-xs text-muted-foreground truncate">{user?.role?.name}</span>
                                </div>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                onClick={handleLogout}
                                title="Logout"
                            >
                                <LogOut className="h-4 w-4" />
                            </Button>
                        </div>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
