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
import * as Pages from "@/lib/lazy-pages";

export interface NavItem {
    title: string;
    icon: any;
    href: string;
    permission?: string; // Optional for public/always visible modules
    preload: () => Promise<any>;
    description?: string;
}

export const NAV_ITEMS: NavItem[] = [
    { 
        title: "Dashboard", 
        icon: LayoutDashboard, 
        href: "/", 
        permission: "dashboard.view",
        preload: Pages.DashboardPage.preload,
        description: "Overview of your business performance and key metrics."
    },
    { 
        title: "POS", 
        icon: CreditCard, 
        href: "/pos", 
        permission: "sales.manage",
        preload: Pages.POSPage.preload,
        description: "Process new sales and manage customer transactions."
    },
    { 
        title: "Customers", 
        icon: UserSquare, 
        href: "/customers", 
        permission: "customers.view",
        preload: Pages.CustomersPage.preload,
        description: "Manage customer profiles and interaction history."
    },
    { 
        title: "Daily Deliveries", 
        icon: CalendarDays, 
        href: "/deliveries", 
        permission: "subscriptions.view", 
        preload: Pages.DeliveriesPage.preload,
        description: "Track and manage daily order fulfillments."
    },
    { 
        title: "Subscriptions", 
        icon: ListTodo, 
        href: "/subscriptions", 
        permission: "subscriptions.view", 
        preload: Pages.SubscriptionsPage.preload,
        description: "Manage customer subscription plans and recurring orders."
    },
    { 
        title: "Monthly Invoices", 
        icon: Receipt, 
        href: "/subscriptions/invoices", 
        permission: "subscriptions.view", 
        preload: Pages.SubscriptionInvoicesPage.preload,
        description: "Review and manage monthly billing for subscription customers."
    },
    { 
        title: "Users", 
        icon: Users, 
        href: "/users", 
        permission: "users.view", 
        preload: Pages.UsersPage.preload,
        description: "Manage employee accounts and system access."
    },
    { 
        title: "Roles", 
        icon: Shield, 
        href: "/roles", 
        permission: "roles.view", 
        preload: Pages.RolesPage.preload,
        description: "Define and manage system roles and permissions."
    },
    { 
        title: "Warehouses", 
        icon: Warehouse, 
        href: "/warehouses", 
        permission: "warehouses.view", 
        preload: Pages.WarehousesPage.preload,
        description: "Manage physical storage locations and layout."
    },
    { 
        title: "Categories", 
        icon: Tags, 
        href: "/categories", 
        permission: "categories.view", 
        preload: Pages.CategoriesPage.preload,
        description: "Organize products into logical categories."
    },
    { 
        title: "Product Families", 
        icon: FolderTree, 
        href: "/product-families", 
        permission: "product_families.view", 
        preload: Pages.ProductFamiliesPage.preload,
        description: "Manage groups of related product variants."
    },
    { 
        title: "Products", 
        icon: Package, 
        href: "/products", 
        permission: "products.view", 
        preload: Pages.ProductsPage.preload,
        description: "Complete product catalog management."
    },
    { 
        title: "Suppliers", 
        icon: Truck, 
        href: "/suppliers", 
        permission: "suppliers.view", 
        preload: Pages.SuppliersPage.preload,
        description: "Manage vendor relationships and supply chains."
    },
    { 
        title: "Inventory", 
        icon: BoxesIcon, 
        href: "/inventory", 
        permission: "inventory.view", 
        preload: Pages.InventoryPage.preload,
        description: "Real-time stock tracking and inventory audits."
    },
    { 
        title: "Expenses", 
        icon: Receipt, 
        href: "/expenses", 
        permission: "expenses.view", 
        preload: Pages.ExpensesPage.preload,
        description: "Track business expenditures and categories."
    },
    { 
        title: "Sales History", 
        icon: History, 
        href: "/sales/history", 
        permission: "sales.view", 
        preload: Pages.SalesRecordPage.preload,
        description: "Review past transactions and collection reports."
    },
    { 
        title: "Collections", 
        icon: ClipboardList, 
        href: "/collections", 
        permission: "collections.view", 
        preload: Pages.CollectionPage.preload,
        description: "Manage and record field payment collections."
    },
    { 
        title: "Procurements", 
        icon: ShoppingCart, 
        href: "/procurements", 
        permission: "procurement.view", 
        preload: Pages.ProcurementsPage.preload,
        description: "Handle purchase orders and vendor shipments."
    },
    { 
        title: "Delivery Zones", 
        icon: MapPin, 
        href: "/serviceability/zones", 
        permission: "serviceability.view", 
        preload: Pages.ServiceabilityZonesPage.preload,
        description: "Define geographical delivery boundaries."
    },
    { 
        title: "Pincode Import", 
        icon: UploadCloud, 
        href: "/serviceability/import", 
        permission: "serviceability.manage", 
        preload: Pages.PincodeImportPage.preload,
        description: "Bulk import serviceable pin codes."
    },
    { 
        title: "Serviceability Map", 
        icon: MapIcon, 
        href: "/serviceability/map", 
        permission: "serviceability.manage", 
        preload: Pages.ServiceabilityMapPage.preload,
        description: "Visual map of delivery operations."
    },
];