import React, { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  CircleUser,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Home,
  ShoppingBag,
  Clock,
  Gift,
  BadgePercent,
  User,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useCart } from "@/hooks/use-cart";
import { CartSheet } from "@/components/user/cart-sheet";

interface UserLayoutProps {
  children: ReactNode;
}

export default function UserLayout({ children }: UserLayoutProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logoutMutation } = useAuth();
  const { cartItems, isCartOpen, setIsCartOpen } = useCart();
  const [location] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const menuItems = [
    {
      icon: <Home className="h-5 w-5" />,
      label: "Dashboard",
      href: "/dashboard",
    },
    {
      icon: <ShoppingBag className="h-5 w-5" />,
      label: "Menu",
      href: "/menu",
    },
    {
      icon: <Clock className="h-5 w-5" />,
      label: "My Orders",
      href: "/orders",
    },
    {
      icon: <Gift className="h-5 w-5" />,
      label: "Loyalty Rewards",
      href: "/loyalty",
    },
    {
      icon: <BadgePercent className="h-5 w-5" />,
      label: "Surplus Deals",
      href: "/surplus-deals",
    },
    {
      icon: <User className="h-5 w-5" />,
      label: "My Profile",
      href: "/profile",
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
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <ShoppingBag className="h-6 w-6 text-primary" />
            <span className="text-lg">Smart Canteen</span>
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
                href="/dashboard"
                className="flex items-center gap-2 font-semibold"
                onClick={() => setIsOpen(false)}
              >
                <ShoppingBag className="h-6 w-6 text-primary" />
                <span className="text-lg">Smart Canteen</span>
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
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <ShoppingBag className="h-6 w-6 text-primary" />
          <span className="text-lg">Smart Canteen</span>
        </Link>
        
        {/* Cart button on mobile */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="ml-auto relative"
          onClick={() => setIsCartOpen(true)}
        >
          <ShoppingBag className="h-5 w-5" />
          {cartItems.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {cartItems.length}
            </span>
          )}
        </Button>
      </header>
      
      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
        
        {/* Cart Sheet */}
        <CartSheet 
          open={isCartOpen} 
          onOpenChange={setIsCartOpen} 
        />
      </main>
    </div>
  );
}