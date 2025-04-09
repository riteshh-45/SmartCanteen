import React, { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  CircleUser,
  ShoppingBag,
  BarChart3,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Settings,
  Gift,
  Building2,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const menuItems = [
    {
      icon: <BarChart3 className="h-5 w-5" />,
      label: "Dashboard",
      href: "/admin/dashboard",
    },
    {
      icon: <ShoppingBag className="h-5 w-5" />,
      label: "Menu Management",
      href: "/admin/menu",
    },
    {
      icon: <Settings className="h-5 w-5" />,
      label: "Orders",
      href: "/admin/orders",
    },
    {
      icon: <Gift className="h-5 w-5" />,
      label: "Loyalty Program",
      href: "/admin/loyalty",
    },
    {
      icon: <Building2 className="h-5 w-5" />,
      label: "NGO Partners",
      href: "/admin/ngo-partners",
    },
  ];

  const renderMenuItems = () => {
    return menuItems.map((item, index) => (
      <Link href={item.href} key={index}>
        <Button
          variant={location === item.href ? "default" : "ghost"}
          className="w-full justify-start"
          onClick={() => setIsOpen(false)}
        >
          {item.icon}
          <span className="ml-2">{item.label}</span>
          {location === item.href && <ChevronRight className="ml-auto h-4 w-4" />}
        </Button>
      </Link>
    ));
  };

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar for desktop */}
      <aside className="hidden lg:flex w-64 flex-col border-r bg-card">
        <div className="flex h-14 items-center px-4 py-4 lg:h-[60px] lg:px-6">
          <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold">
            <ShoppingBag className="h-6 w-6 text-primary" />
            <span className="text-lg">Admin Panel</span>
          </Link>
        </div>
        <Separator />
        <nav className="flex-1 overflow-auto py-2">
          <div className="flex flex-col gap-1 px-2">{renderMenuItems()}</div>
        </nav>
        <Separator />
        <div className="p-4">
          <div className="flex items-center gap-2 rounded-lg bg-muted p-4">
            <CircleUser className="h-8 w-8 text-primary" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">{user?.name}</span>
              <span className="text-xs text-gray-500">{user?.email}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>
      
      {/* Mobile header and sidebar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static lg:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-60 sm:w-80 lg:hidden">
            <div className="flex h-14 items-center px-4">
              <Link
                href="/admin/dashboard"
                className="flex items-center gap-2 font-semibold"
                onClick={() => setIsOpen(false)}
              >
                <ShoppingBag className="h-6 w-6 text-primary" />
                <span className="text-lg">Admin Panel</span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <Separator />
            <nav className="flex-1 overflow-auto py-2">
              <div className="flex flex-col gap-1 px-2">{renderMenuItems()}</div>
            </nav>
            <Separator />
            <div className="p-4">
              <div className="flex items-center gap-2 rounded-lg bg-muted p-4">
                <CircleUser className="h-8 w-8 text-primary" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{user?.name}</span>
                  <span className="text-xs text-gray-500">{user?.email}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold">
          <ShoppingBag className="h-6 w-6 text-primary" />
          <span className="text-lg">Admin Panel</span>
        </Link>
      </header>
      
      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}