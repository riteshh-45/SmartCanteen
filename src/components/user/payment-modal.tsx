import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Order } from "@shared/schema";
import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, CreditCard, ShieldCheck, Phone, CreditCardIcon, QrCode } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  orderId: number;
  amount: number;
}

type PaymentMethod = "razorpay" | "phonepe" | "cod" | "qr_code";

export function PaymentModal({ open, onClose, orderId, amount }: PaymentModalProps) {
  // State for payment success callback
  const [paymentComplete, setPaymentComplete] = useState(false);
  
  // Create a mock order object from the orderId and amount
  const order = {
    id: orderId,
    totalAmount: amount
  };
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("phonepe");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCvv] = useState("");
  const { toast } = useToast();
  const [, navigate] = useLocation();

  if (!order) return null;

  const handlePayment = async () => {
    setIsProcessing(true);
    setCurrentStep(1);

    try {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (paymentMethod === "qr_code") {
        // Navigate to QR code payment page
        setCurrentStep(2);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Update order to pending status
        await apiRequest("PATCH", `/api/orders/${order.id}/status`, {
          status: "pending"
        });
        
        // Navigate to QR code payment page with necessary parameters
        navigate(`/pay/qr-code/${order.id}`);
        
        // Close the modal after navigation
        onClose();
        return;
      }
      // Move to redirect step for PhonePe
      else if (paymentMethod === "phonepe") {
        setCurrentStep(2);
        
        try {
          // Initiate PhonePe payment
          const response = await apiRequest("POST", "/api/payment/phonepe/init", {
            orderId: order.id,
            amount: order.totalAmount,
          });
          
          const responseData = await response.json();
          
          if (responseData.redirectUrl) {
            setCurrentStep(3);
            // Simulate a redirect
            await new Promise(resolve => setTimeout(resolve, 1500));
            setCurrentStep(4);
            
            // Check payment status
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const statusResponse = await apiRequest("GET", `/api/payment/phonepe/status/${order.id}`);
            const statusData = await statusResponse.json();
            
            if (statusData.success) {
              // Payment successful
              setCurrentStep(5);
              await new Promise(resolve => setTimeout(resolve, 1500));
              await apiRequest("PATCH", `/api/orders/${order.id}/status`, {
                status: "confirmed"
              });
              
              setPaymentComplete(true);
              onClose();
            } else {
              // Payment failed
              setCurrentStep(6);
              toast({
                title: "Payment Failed",
                description: "Your payment could not be processed. Please try again.",
                variant: "destructive",
              });
            }
          }
        } catch (error) {
          console.error("PhonePe payment error:", error);
          setCurrentStep(6);
          toast({
            title: "Payment Failed",
            description: "There was an error processing your payment. Please try again.",
            variant: "destructive",
          });
        }
      } else if (paymentMethod === "razorpay") {
        // Simulate Razorpay payment flow
        setCurrentStep(2);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setCurrentStep(4);
        await new Promise(resolve => setTimeout(resolve, 2000));
        setCurrentStep(5);
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        await apiRequest("PATCH", `/api/orders/${order.id}/status`, {
          status: "confirmed"
        });
        
        setPaymentComplete(true);
        onClose();
      } else if (paymentMethod === "cod") {
        // For COD, update order status to confirmed and show success
        await apiRequest("PATCH", `/api/orders/${order.id}/status`, {
          status: "confirmed"
        });
        setCurrentStep(5);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setPaymentComplete(true);
        onClose();
      }
    } catch (error) {
      console.error("Payment error:", error);
      setCurrentStep(6);
      toast({
        title: "Payment Failed",
        description: "There was an error processing your payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderPaymentMethodInput = () => {
    switch (paymentMethod) {
      case "razorpay":
      case "phonepe":
        return (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="card-number">Card Number</Label>
                <Input
                  id="card-number"
                  placeholder="4111 1111 1111 1111"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name on Card</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiry">Expiry Date</Label>
                <Input
                  id="expiry"
                  placeholder="MM/YY"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  type="password"
                  placeholder="•••"
                  maxLength={3}
                  value={cardCvv}
                  onChange={(e) => setCvv(e.target.value)}
                />
              </div>
            </div>
          </div>
        );
      case "qr_code":
        return (
          <div className="py-4">
            <p className="text-muted-foreground mb-3">
              Pay using PhonePe by scanning our QR code
            </p>
            <div className="bg-purple-50 p-4 rounded-lg flex flex-col items-center">
              <QrCode className="h-12 w-12 mb-3 text-purple-700" />
              <p className="text-sm font-medium text-center">
                Scan the QR code to pay ₹{typeof order.totalAmount === 'string' 
                  ? parseFloat(order.totalAmount).toFixed(2) 
                  : order.totalAmount.toFixed(2)}
              </p>
            </div>
            <p className="text-xs text-center mt-2 text-muted-foreground">
              You will be redirected to a page to verify your payment
            </p>
          </div>
        );
      case "cod":
        return (
          <div className="py-4">
            <p className="text-muted-foreground">
              You will pay when your order is delivered. Please have the exact change ready.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  const renderPaymentProcessingContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
            <p className="text-center text-lg font-medium">Processing payment...</p>
            <p className="text-center text-sm text-muted-foreground">
              Please do not close this window or refresh the page.
            </p>
          </div>
        );
      case 2:
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Phone className="h-12 w-12 mb-4 text-primary" />
            </motion.div>
            <p className="text-center text-lg font-medium">Connecting to {paymentMethod === "phonepe" ? "PhonePe" : "Razorpay"}...</p>
            <p className="text-center text-sm text-muted-foreground">
              You will be redirected to complete the payment.
            </p>
          </div>
        );
      case 3:
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <motion.div
              animate={{ 
                y: [0, -10, 0],
                transition: { 
                  repeat: Infinity, 
                  duration: 1.5 
                }
              }}
            >
              <CreditCardIcon className="h-12 w-12 mb-4 text-primary" />
            </motion.div>
            <p className="text-center text-lg font-medium">
              Redirecting to secure payment page...
            </p>
            <p className="text-center text-sm text-muted-foreground">
              You'll be taken to {paymentMethod === "phonepe" ? "PhonePe" : "Razorpay"}'s secure payment page
            </p>
          </div>
        );
      case 4:
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 10, 0],
                transition: { 
                  repeat: Infinity, 
                  duration: 2 
                }
              }}
            >
              <ShieldCheck className="h-12 w-12 mb-4 text-amber-500" />
            </motion.div>
            <p className="text-center text-lg font-medium">
              Verifying payment...
            </p>
            <p className="text-center text-sm text-muted-foreground">
              Please wait while we confirm your payment.
            </p>
          </div>
        );
      case 5:
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                type: "spring",
                stiffness: 260,
                damping: 20,
                duration: 0.5 
              }}
            >
              <div className="rounded-full bg-green-100 p-3">
                <Check className="h-10 w-10 text-green-600" />
              </div>
            </motion.div>
            <h3 className="mt-4 text-xl font-semibold text-gray-900">Payment Successful!</h3>
            <p className="mt-1 text-sm text-gray-500">
              Your order has been confirmed and is being prepared.
            </p>
            <p className="mt-3 text-sm font-medium">
              Order ID: #{order.id}
            </p>
          </div>
        );
      case 6:
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="rounded-full bg-red-100 p-3"
            >
              <svg className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.div>
            <h3 className="mt-4 text-xl font-semibold text-gray-900">Payment Failed</h3>
            <p className="mt-1 text-sm text-gray-500">
              There was an issue processing your payment. Please try again.
            </p>
            <Button 
              className="mt-4" 
              onClick={() => setCurrentStep(0)}
            >
              Try Again
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isProcessing && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Payment</DialogTitle>
          <DialogDescription>
            Complete your payment to finish placing your order.
          </DialogDescription>
        </DialogHeader>

        {currentStep === 0 ? (
          <div className="py-4">
            <div className="mb-6">
              <p className="font-medium">Order Summary</p>
              <div className="flex justify-between mt-2">
                <span className="text-sm text-muted-foreground">Order #{order.id}</span>
                <span className="font-medium">₹{typeof order.totalAmount === 'string' 
                  ? parseFloat(order.totalAmount).toFixed(2) 
                  : order.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <p className="font-medium mb-3">Select Payment Method</p>
            <RadioGroup 
              value={paymentMethod} 
              onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
              className="space-y-3"
            >
              <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                <RadioGroupItem value="qr_code" id="qr_code" />
                <Label htmlFor="qr_code" className="flex items-center cursor-pointer">
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="h-6 w-6 rounded mr-2 bg-purple-700 flex items-center justify-center"
                  >
                    <QrCode className="h-4 w-4 text-white" />
                  </motion.div>
                  PhonePe QR Code
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                <RadioGroupItem value="phonepe" id="phonepe" />
                <Label htmlFor="phonepe" className="flex items-center cursor-pointer">
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="h-6 w-6 rounded mr-2 bg-purple-700 flex items-center justify-center"
                  >
                    <Phone className="h-4 w-4 text-white" />
                  </motion.div>
                  PhonePe
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                <RadioGroupItem value="razorpay" id="razorpay" />
                <Label htmlFor="razorpay" className="flex items-center cursor-pointer">
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="h-6 w-6 rounded mr-2 bg-blue-600 flex items-center justify-center"
                  >
                    <CreditCard className="h-4 w-4 text-white" />
                  </motion.div>
                  Razorpay
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                <RadioGroupItem value="cod" id="cod" />
                <Label htmlFor="cod" className="flex items-center cursor-pointer">
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="h-6 w-6 rounded mr-2 bg-green-600 flex items-center justify-center"
                  >
                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                  </motion.div>
                  Cash on Delivery
                </Label>
              </div>
            </RadioGroup>

            <AnimatePresence mode="wait">
              <motion.div
                key={paymentMethod}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                {renderPaymentMethodInput()}
              </motion.div>
            </AnimatePresence>

            <DialogFooter className="mt-4">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full"
              >
                <Button 
                  className="w-full" 
                  onClick={handlePayment}
                  disabled={isProcessing}
                >
                  Pay ₹{typeof order.totalAmount === 'string' 
                    ? parseFloat(order.totalAmount).toFixed(2) 
                    : order.totalAmount.toFixed(2)}
                </Button>
              </motion.div>
            </DialogFooter>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.3 }}
            >
              {renderPaymentProcessingContent()}
            </motion.div>
          </AnimatePresence>
        )}
      </DialogContent>
    </Dialog>
  );
}