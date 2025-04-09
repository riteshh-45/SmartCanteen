import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CartSheet } from "@/components/user/cart-sheet";
import { Menu, ShoppingBag, Package, User, Award, ChevronDown, LogOut, Home, CreditCard, ChefHat, BarChart, Coffee, Settings } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

export function MainNavigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { cartCount, cartItems, clearCart } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const isMobile = useIsMobile();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  
  const isActive = (path: string) => {
    return location === path;
  };
  
  const handleLogout = () => {
    clearCart();
    logoutMutation.mutate();
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase();
  };
  
  const navLinkVariants = {
    initial: { opacity: 0, y: -10 },
    animate: (delay: number) => ({ 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.3,
        delay: delay * 0.1,
      }
    }),
    hover: { 
      scale: 1.05,
      transition: { duration: 0.2 }
    }
  };
  
  const navLinks = [
    // Student Links
    ...(user?.role === "student" ? [
      { name: "Home", href: "/", icon: <Home className="h-5 w-5" /> },
      { name: "Menu", href: "/menu", icon: <Coffee className="h-5 w-5" /> },
      { name: "Orders", href: "/orders", icon: <Package className="h-5 w-5" /> },
      { name: "Loyalty", href: "/loyalty", icon: <Award className="h-5 w-5" /> },
    ] : []),
    
    // Admin Links
    ...(user?.role === "admin" ? [
      { name: "Dashboard", href: "/admin/dashboard", icon: <BarChart className="h-5 w-5" /> },
      { name: "Menu", href: "/admin/menu", icon: <Coffee className="h-5 w-5" /> },
      { name: "Orders", href: "/admin/orders", icon: <Package className="h-5 w-5" /> },
      { name: "Loyalty", href: "/admin/loyalty", icon: <Award className="h-5 w-5" /> },
    ] : []),
    
    // Kitchen Staff Links
    ...(user?.role === "kitchen" ? [
      { name: "Orders Queue", href: "/kitchen/orders", icon: <ChefHat className="h-5 w-5" /> },
    ] : []),
  ];
  
  return (
    <>
      <header 
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          isScrolled ? "bg-white/95 backdrop-blur-md shadow-sm py-2 border-b border-orange-100" : "bg-white/90 backdrop-blur-md py-3"
        }`}
      >
        <div className="container mx-auto flex justify-between items-center px-4">
          {/* Logo */}
          <Link href="/">
            <motion.div 
              className="flex items-center cursor-pointer" 
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <div className="h-8 w-8 rounded-md bg-orange-500 flex items-center justify-center mr-2 shadow-sm">
                <div className="text-white font-bold text-sm">SC</div>
              </div>
              <h1 className="text-xl font-bold tracking-tight">
                <span className="text-orange-500">Smart</span> Canteen
              </h1>
            </motion.div>
          </Link>
          
          {/* Desktop Navigation */}
          {!isMobile && (
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link, index) => (
                <motion.div
                  key={link.name}
                  custom={index}
                  initial="initial"
                  animate="animate"
                  variants={navLinkVariants}
                  whileHover="hover"
                >
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={isActive(link.href) ? "default" : "ghost"}
                          size="sm"
                          asChild
                          className={`gap-2 rounded-full px-4 ${isActive(link.href) ? "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary font-medium shadow-sm" : ""}`}
                        >
                          <Link href={link.href}>
                            {link.icon}
                            <span>{link.name}</span>
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{link.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </motion.div>
              ))}
            </nav>
          )}
          
          {/* User Actions */}
          <div className="flex items-center gap-2">
            {/* Cart Button (Only for students) */}
            {user?.role === "student" && (
              <motion.div 
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }}
                className="relative"
              >
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setCartOpen(true)}
                  className="rounded-full p-2 bg-orange-50 border border-orange-200 hover:bg-orange-100 hover:border-orange-300 shadow-sm"
                >
                  <ShoppingBag className="h-5 w-5 text-orange-500" />
                  <AnimatePresence>
                    {cartCount > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -top-2 -right-2"
                      >
                        <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px] shadow-sm">
                          {cartCount}
                        </Badge>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>
              </motion.div>
            )}
            
            {/* User Menu / Auth Status */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="flex items-center gap-2 p-1 pl-2 pr-2"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" />
                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    {!isMobile && (
                      <>
                        <div className="flex flex-col items-start text-sm">
                          <span className="font-medium">{user.name}</span>
                          <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
                        </div>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span>{user.name}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {user.role === "student" && (
                    <>
                      <Link href="/profile">
                        <DropdownMenuItem>
                          <User className="mr-2 h-4 w-4" />
                          <span>Profile</span>
                        </DropdownMenuItem>
                      </Link>
                      <Link href="/orders">
                        <DropdownMenuItem>
                          <Package className="mr-2 h-4 w-4" />
                          <span>My Orders</span>
                        </DropdownMenuItem>
                      </Link>
                      <Link href="/loyalty">
                        <DropdownMenuItem>
                          <Award className="mr-2 h-4 w-4" />
                          <span>Loyalty Points</span>
                          <div className="ml-auto">
                            <Badge variant="outline">{user.loyaltyPoints}</Badge>
                          </div>
                        </DropdownMenuItem>
                      </Link>
                    </>
                  )}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button asChild>
                  <Link href="/auth">Login</Link>
                </Button>
              </motion.div>
            )}
            
            {/* Mobile Menu */}
            {isMobile && user && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="rounded-full bg-white text-orange-500 border-orange-200 hover:bg-orange-50">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                  <div className="py-4">
                    <div className="flex items-center gap-4 mb-6 pb-6 border-b">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src="" />
                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
                      </div>
                    </div>
                    
                    <nav className="space-y-4">
                      {navLinks.map((link) => (
                        <Link key={link.name} href={link.href}>
                          <motion.div
                            whileHover={{ x: 5 }}
                            className={`flex items-center gap-3 py-3 px-4 rounded-lg transition-all duration-200 ${
                              isActive(link.href) 
                                ? "bg-primary/10 text-primary font-medium" 
                                : "text-gray-700 hover:bg-primary/5"
                            }`}
                          >
                            {link.icon}
                            <span>{link.name}</span>
                          </motion.div>
                        </Link>
                      ))}
                      
                      <div className="pt-4 border-t mt-4">
                        <Button 
                          variant="outline" 
                          className="w-full justify-start rounded-lg bg-red-50/50 border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700" 
                          onClick={handleLogout}
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Log out
                        </Button>
                      </div>
                    </nav>
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>
      </header>
      
      {/* Cart Sheet */}
      {user?.role === "student" && (
        <CartSheet 
          open={cartOpen} 
          onOpenChange={setCartOpen} 
        />
      )}
    </>
  );
}