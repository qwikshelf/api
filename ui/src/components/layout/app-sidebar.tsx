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

import * as Pages from "@/lib/lazy-pages";

const navItems = [
    { title: "Dashboard", icon: LayoutDashboard, href: "/", permission: "dashboard.view", preload: Pages.DashboardPage.preload },
    { title: "POS", icon: CreditCard, href: "/pos", permission: "sales.manage", preload: Pages.POSPage.preload },
    { title: "Customers", icon: UserSquare, href: "/customers", permission: "customers.view", preload: Pages.CustomersPage.preload },
    { title: "Daily Deliveries", icon: CalendarDays, href: "/deliveries", permission: "subscriptions.view", preload: Pages.DeliveriesPage.preload },
    { title: "Subscriptions", icon: ListTodo, href: "/subscriptions", permission: "subscriptions.view", preload: Pages.SubscriptionsPage.preload },
    { title: "Users", icon: Users, href: "/users", permission: "users.view", preload: Pages.UsersPage.preload },
    { title: "Roles", icon: Shield, href: "/roles", permission: "roles.view", preload: Pages.RolesPage.preload },
    { title: "Warehouses", icon: Warehouse, href: "/warehouses", permission: "warehouses.view", preload: Pages.WarehousesPage.preload },
    { title: "Categories", icon: Tags, href: "/categories", permission: "products.view", preload: Pages.CategoriesPage.preload },
    { title: "Product Families", icon: FolderTree, href: "/product-families", permission: "products.view", preload: Pages.ProductFamiliesPage.preload },
    { title: "Products", icon: Package, href: "/products", permission: "products.view", preload: Pages.ProductsPage.preload },
    { title: "Suppliers", icon: Truck, href: "/suppliers", permission: "suppliers.view", preload: Pages.SuppliersPage.preload },
    { title: "Inventory", icon: BoxesIcon, href: "/inventory", permission: "inventory.view", preload: Pages.InventoryPage.preload },
    { title: "Expenses", icon: Receipt, href: "/expenses", permission: "expenses.view", preload: Pages.ExpensesPage.preload },
    { title: "Sales History", icon: History, href: "/sales/history", permission: "sales.view", preload: Pages.SalesRecordPage.preload },
    { title: "Collections", icon: ClipboardList, href: "/collections", permission: "collections.view", preload: Pages.CollectionPage.preload },
    { title: "Procurements", icon: ShoppingCart, href: "/procurements", permission: "procurement.view", preload: Pages.ProcurementsPage.preload },
    { title: "Delivery Zones", icon: MapPin, href: "/serviceability/zones", permission: "serviceability.manage", preload: Pages.ServiceabilityZonesPage.preload },
    { title: "Pincode Import", icon: UploadCloud, href: "/serviceability/import", permission: "serviceability.manage", preload: Pages.PincodeImportPage.preload },
    { title: "Serviceability Map", icon: MapIcon, href: "/serviceability/map", permission: "serviceability.manage", preload: Pages.ServiceabilityMapPage.preload },
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
                                        onMouseEnter={() => {
                                            // Preload the page chunk when user hovers over the menu item
                                            if (item.preload) {
                                                item.preload();
                                            }
                                        }}
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
