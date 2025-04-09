import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useCart } from '@/hooks/use-cart';
import { useAuth } from '@/hooks/use-auth';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Trash2, Plus, Minus, ShoppingBag, Clock, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '@/lib/utils';
import { DateTimePicker } from "@/components/ui/date-time-picker/date-time-picker";

interface CartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartSheet({ open, onOpenChange }: CartSheetProps) {
  const { 
    cartItems, 
    cartTotal, 
    updateQuantity, 
    removeFromCart, 
    clearCart,
    isPreorder,
    setIsPreorder,
    pickupTime,
    setPickupTime
  } = useCart();
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  
  // Close cart when navigating away
  useEffect(() => {
    return () => {
      onOpenChange(false);
    };
  }, [location]);

  const handleCheckout = () => {
    onOpenChange(false);
    setLocation('/checkout');
  };

  const itemVariants = {
    hidden: { opacity: 0, height: 0, marginBottom: 0 },
    visible: { 
      opacity: 1, 
      height: 'auto', 
      marginBottom: 16,
      transition: { duration: 0.2 } 
    },
    exit: { 
      opacity: 0, 
      height: 0, 
      marginBottom: 0,
      transition: { duration: 0.2 } 
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg md:max-w-xl flex flex-col">
        <SheetHeader className="px-1">
          <SheetTitle className="text-xl flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-orange-500" />
            Your Cart
            <span className="text-sm font-normal text-muted-foreground ml-auto">
              {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
            </span>
          </SheetTitle>
        </SheetHeader>
        
        {cartItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-10 gap-3">
            <div className="h-24 w-24 rounded-full bg-orange-50 flex items-center justify-center mb-2">
              <ShoppingBag className="h-12 w-12 text-orange-300" />
            </div>
            <h3 className="font-medium text-lg">Your cart is empty</h3>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Looks like you haven't added any items to your cart yet. Start ordering delicious food!
            </p>
            <Button 
              variant="default" 
              size="lg" 
              className="mt-4 gap-2 bg-orange-500 hover:bg-orange-600"
              onClick={() => {
                onOpenChange(false);
                setLocation('/menu');
              }}
            >
              View Menu
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 mt-4 px-1">
              <AnimatePresence initial={false}>
                {cartItems.map((item) => (
                  <motion.div
                    key={item.menuItemId}
                    layout
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="flex gap-3 mb-4 pb-4 border-b"
                  >
                    <div className="h-20 w-20 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="h-full w-full object-cover" 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-base truncate">{item.name}</h4>
                        <span className="font-medium text-orange-600">
                          {formatCurrency(item.price)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-end mt-2">
                        <div className="flex items-center border rounded-full overflow-hidden">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-full" 
                            onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-full" 
                            onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full"
                          onClick={() => removeFromCart(item.menuItemId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              <div className="py-2">
                <div className="flex items-center gap-2 mb-4">
                  <input 
                    type="checkbox" 
                    id="preorder" 
                    checked={isPreorder}
                    onChange={(e) => setIsPreorder(e.target.checked)}
                    className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                  <label htmlFor="preorder" className="text-sm font-medium flex items-center gap-1">
                    <Clock className="h-4 w-4 text-orange-500" />
                    Pre-order for later
                  </label>
                </div>
                
                {isPreorder && (
                  <div className="mb-4">
                    <label className="text-sm font-medium mb-1 block">Select pickup time</label>
                    <DateTimePicker 
                      value={pickupTime} 
                      onChange={setPickupTime} 
                      minDate={new Date()}
                    />
                  </div>
                )}
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-center mt-2 border-dashed text-muted-foreground"
                  onClick={() => clearCart()}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear cart
                </Button>
              </div>
            </ScrollArea>
            
            <div className="pt-4 mt-auto">
              <Separator className="mb-4" />
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(cartTotal)}</span>
                </div>
                {/* Add tax, service fee etc here if needed */}
                <div className="flex justify-between font-medium text-lg">
                  <span>Total</span>
                  <span className="text-orange-600">{formatCurrency(cartTotal)}</span>
                </div>
              </div>
              
              <SheetFooter className="sm:justify-start">
                <Button 
                  className="w-full bg-orange-500 hover:bg-orange-600 rounded-full shadow-sm py-6"
                  onClick={handleCheckout}
                  disabled={cartItems.length === 0}
                >
                  Proceed to Checkout
                </Button>
              </SheetFooter>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}