import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/use-cart";
import { apiRequest } from "@/lib/queryClient";
import { MenuItemWithCategory, OrderWithItems } from "@shared/schema";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

interface OrderEditDialogProps {
  order: OrderWithItems | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderEditDialog({ order, open, onOpenChange }: OrderEditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [items, setItems] = useState<{
    menuItemId: number;
    name: string;
    price: number;
    quantity: number;
    image: string;
  }[]>([]);
  
  // Initialize the state when the order changes
  useEffect(() => {
    if (order) {
      setSpecialInstructions(order.specialInstructions || "");
      setItems(
        order.items.map((item) => ({
          menuItemId: item.menuItem.id,
          name: item.menuItem.name,
          price: Number(item.price),
          quantity: item.quantity,
          image: item.menuItem.image,
        }))
      );
    }
  }, [order]);

  // Calculate the total amount
  const totalAmount = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Handle quantity changes
  const updateQuantity = (menuItemId: number, change: number) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.menuItemId === menuItemId) {
          const newQuantity = Math.max(1, item.quantity + change);
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  // Handle item removal
  const removeItem = (menuItemId: number) => {
    setItems((prevItems) => 
      prevItems.filter((item) => item.menuItemId !== menuItemId)
    );
  };

  // Handle order update submission
  const handleSubmit = async () => {
    if (!order) return;
    
    // Don't allow empty orders
    if (items.length === 0) {
      toast({
        title: "Cannot update order",
        description: "Please add at least one item to your order.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Format the items for the API
      const formattedItems = items.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        price: item.price,
      }));
      
      // Send the update request
      await apiRequest(`/api/orders/${order.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          specialInstructions,
          items: formattedItems,
        }),
      });
      
      // Invalidate the orders cache to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", order.id] });
      
      // Show success message
      toast({
        title: "Order updated",
        description: "Your order has been successfully updated.",
      });
      
      // Close the dialog
      onOpenChange(false);
    } catch (error) {
      // Handle errors
      let errorMessage = "Failed to update your order. Please try again.";
      
      if (error instanceof Response) {
        const data = await error.json();
        if (data.message) {
          errorMessage = data.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Order #{order?.id}</DialogTitle>
          <DialogDescription>
            You can edit this order because it hasn't been prepared yet.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Order items */}
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {items.map((item) => (
              <div key={item.menuItemId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-gray-500 text-xs">₹{item.price.toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateQuantity(item.menuItemId, -1)}
                    disabled={item.quantity <= 1}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  
                  <span className="w-5 text-center">{item.quantity}</span>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateQuantity(item.menuItemId, 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-500"
                    onClick={() => removeItem(item.menuItemId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            {items.length === 0 && (
              <div className="text-center py-4">
                <p className="text-gray-500">
                  You've removed all items. Add at least one item to update your order.
                </p>
              </div>
            )}
          </div>
          
          {/* Special instructions */}
          <div>
            <label htmlFor="special-instructions" className="text-sm font-medium">
              Special Instructions
            </label>
            <Textarea
              id="special-instructions"
              placeholder="Any special requests or dietary notes for the kitchen..."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              className="mt-1"
            />
          </div>
          
          {/* Order total */}
          <div className="pt-2">
            <Separator className="my-2" />
            <div className="flex justify-between font-medium">
              <span>Total</span>
              <span>₹{totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || items.length === 0}
          >
            Update Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}