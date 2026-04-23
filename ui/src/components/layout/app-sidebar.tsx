import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, ChevronLeft } from "lucide-react";
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
import { NAV_ITEMS } from "@/config/navigation";

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
                            {NAV_ITEMS.filter(item => {
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
