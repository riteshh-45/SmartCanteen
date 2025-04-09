import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { X, Plus, Minus, ShoppingBag, Clock, Calendar } from "lucide-react";
import { Loader2 } from "lucide-react";
import { PaymentModal } from "./payment-modal";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

type CartModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function CartModal({ isOpen, onClose }: CartModalProps) {
  const { 
    cartItems, 
    removeFromCart, 
    increaseQuantity, 
    decreaseQuantity, 
    cartTotal,
    placeOrder,
    isPlacingOrder,
    showPayment,
    setShowPayment,
    currentOrderId,
    isPreorderMode,
    setIsPreorderMode,
    preorderDetails,
    setPreorderDetails
  } = useCart();
  
  // For time selection
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHour, setSelectedHour] = useState<number>(9);
  const [selectedMinute, setSelectedMinute] = useState<number>(0);
  const [showCalendar, setShowCalendar] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState("");
  
  // Get the updatePreorderDetails function from context
  const { updatePreorderDetails } = useCart();
  
  // Effect to sync the preorder details with the state
  useEffect(() => {
    if (isPreorderMode && selectedDate) {
      const date = new Date(selectedDate);
      date.setHours(selectedHour, selectedMinute, 0);
      
      // Use updatePreorderDetails for partial updates
      updatePreorderDetails({
        pickupTime: date,
        specialInstructions
      });
    }
  }, [selectedDate, selectedHour, selectedMinute, specialInstructions, isPreorderMode, updatePreorderDetails]);
  
  // Effect to set the initial values when the preorder mode changes
  useEffect(() => {
    if (isPreorderMode) {
      if (preorderDetails.pickupTime) {
        setSelectedDate(preorderDetails.pickupTime);
        setSelectedHour(preorderDetails.pickupTime.getHours());
        setSelectedMinute(preorderDetails.pickupTime.getMinutes());
      } else {
        // Set default time to 2 hours from now
        const defaultTime = new Date();
        defaultTime.setHours(defaultTime.getHours() + 2, 0, 0);
        setSelectedDate(defaultTime);
        setSelectedHour(defaultTime.getHours());
        setSelectedMinute(0);
      }
      
      if (preorderDetails.specialInstructions) {
        setSpecialInstructions(preorderDetails.specialInstructions);
      }
    }
  }, [isPreorderMode, preorderDetails]);
  
  // Handle place order with preorder
  const handlePlaceOrder = () => {
    if (isPreorderMode) {
      if (!selectedDate) {
        return; // Validation is handled in placeOrder function
      }
      
      // Create a date object with the selected date and time
      const pickupTime = new Date(selectedDate);
      pickupTime.setHours(selectedHour, selectedMinute, 0);
      
      placeOrder({
        isPreorder: true,
        pickupTime,
        specialInstructions
      });
    } else {
      placeOrder();
    }
  };
  
  if (!isOpen) return null;
  
  // Calculate GST (5%)
  const gst = cartTotal * 0.05;
  const totalWithGst = cartTotal + gst;
  
  // Generate hour options for the select input (7am to 11pm)
  const hourOptions = Array.from({ length: 17 }, (_, i) => i + 7);
  
  // Generate minute options for the select input (0, 15, 30, 45)
  const minuteOptions = [0, 15, 30, 45];
  
  return (
    <>
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-900 font-heading">Your Cart</h3>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5 text-gray-400" />
            </Button>
          </div>
          
          {cartItems.length === 0 ? (
            <div className="py-8 text-center">
              <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Your cart is empty</p>
              <Button className="mt-4" variant="outline" onClick={onClose}>
                Continue Shopping
              </Button>
            </div>
          ) : (
            <>
              <div className="max-h-60 overflow-y-auto">
                {cartItems.map((item) => (
                  <div key={item.menuItemId} className="flex justify-between items-center py-3 border-b">
                    <div className="flex items-center">
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-gray-900">{item.name}</h4>
                        <p className="text-xs text-gray-500">₹{item.price} x {item.quantity}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="w-6 h-6 rounded-full p-0"
                        onClick={() => decreaseQuantity(item.menuItemId)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="px-2">{item.quantity}</span>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="w-6 h-6 rounded-full p-0"
                        onClick={() => increaseQuantity(item.menuItemId)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="ml-2 text-red-500 hover:text-red-700"
                        onClick={() => removeFromCart(item.menuItemId)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-3 border-t">
                <div className="flex justify-between font-medium">
                  <span>Subtotal:</span>
                  <span>₹{cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600 mt-1">
                  <span>GST (5%):</span>
                  <span>₹{gst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg mt-2">
                  <span>Total:</span>
                  <span>₹{totalWithGst.toFixed(2)}</span>
                </div>
              </div>
              
              {/* Preorder Option Toggle */}
              <div className="mt-4 border-t pt-3">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="preorder-mode" 
                    checked={isPreorderMode}
                    onCheckedChange={setIsPreorderMode}
                  />
                  <Label htmlFor="preorder-mode" className="cursor-pointer">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      Preorder for Later
                    </div>
                  </Label>
                </div>
                
                {/* Preorder Details Section - Only shown when preorder is enabled */}
                {isPreorderMode && (
                  <div className="mt-3 bg-gray-50 p-3 rounded-md">
                    <h4 className="text-sm font-semibold mb-2 flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      Pickup Details
                    </h4>
                    
                    {/* Date Picker */}
                    <div className="mb-3">
                      <Label htmlFor="pickup-date" className="text-xs block mb-1">
                        Pickup Date:
                      </Label>
                      <div className="relative">
                        <Button 
                          variant="outline" 
                          type="button"
                          className="w-full text-left flex justify-between items-center text-sm h-9"
                          onClick={() => setShowCalendar(!showCalendar)}
                        >
                          {selectedDate ? 
                            selectedDate.toLocaleDateString() : 
                            'Select a date'
                          }
                          <Calendar className="h-4 w-4" />
                        </Button>
                        
                        {showCalendar && (
                          <div className="absolute z-10 mt-1 bg-white border rounded-md shadow-lg">
                            <CalendarComponent
                              mode="single"
                              selected={selectedDate || undefined}
                              onSelect={(date) => {
                                if (date) {
                                  setSelectedDate(date);
                                  setShowCalendar(false);
                                }
                              }}
                              disabled={(date) => 
                                date < new Date() || 
                                date > new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                              }
                              initialFocus
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Time Picker */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div>
                        <Label htmlFor="pickup-hour" className="text-xs block mb-1">
                          Hour:
                        </Label>
                        <select
                          id="pickup-hour"
                          className="w-full border border-gray-300 rounded p-2 text-sm"
                          value={selectedHour}
                          onChange={(e) => setSelectedHour(Number(e.target.value))}
                        >
                          {hourOptions.map((hour) => (
                            <option key={hour} value={hour}>
                              {hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="pickup-minute" className="text-xs block mb-1">
                          Minute:
                        </Label>
                        <select
                          id="pickup-minute"
                          className="w-full border border-gray-300 rounded p-2 text-sm"
                          value={selectedMinute}
                          onChange={(e) => setSelectedMinute(Number(e.target.value))}
                        >
                          {minuteOptions.map((minute) => (
                            <option key={minute} value={minute}>
                              {minute === 0 ? '00' : minute}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {/* Special Instructions */}
                    <div className="mb-2">
                      <Label htmlFor="special-instructions" className="text-xs block mb-1">
                        Special Instructions (optional):
                      </Label>
                      <Textarea
                        id="special-instructions"
                        placeholder="Any special requests for your order?"
                        className="w-full h-20 resize-none text-sm"
                        value={specialInstructions}
                        onChange={(e) => setSpecialInstructions(e.target.value)}
                      />
                    </div>
                    
                    {/* Pickup Time Note */}
                    <p className="text-xs text-gray-500 mb-2">
                      Orders must be placed at least 2 hours in advance. Pick up your order at the designated time from the "Preorder Pickup" counter.
                    </p>
                  </div>
                )}
              </div>
              
              <div className="mt-5">
                <Button 
                  className="w-full"
                  onClick={handlePlaceOrder}
                  disabled={isPlacingOrder}
                >
                  {isPlacingOrder ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    isPreorderMode ? 'Place Preorder' : 'Place Order'
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full mt-2"
                  onClick={onClose}
                >
                  Continue Shopping
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Payment Modal */}
      {showPayment && currentOrderId && (
        <PaymentModal 
          open={showPayment}
          onClose={() => {
            setShowPayment(false);
            onClose();
          }}
          orderId={currentOrderId}
          amount={totalWithGst}
        />
      )}
    </>
  );
}
