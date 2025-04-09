import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import LandingPage from "@/pages/landing-page";
import MenuPage from "@/pages/user/menu-page";
import CheckoutPage from "@/pages/user/checkout-page";
import OrdersPage from "@/pages/user/orders-page";
import LoyaltyPage from "@/pages/user/loyalty-page";
import SurplusDealsPage from "@/pages/user/surplus-deals-page";
import ProfilePage from "@/pages/user/profile-page";
import AdminDashboardPage from "@/pages/admin/dashboard-page";
import AdminMenuManagementPage from "@/pages/admin/menu-management-page";
import LoyaltyManagementPage from "@/pages/admin/loyalty-management-page";
import NgoManagementPage from "@/pages/admin/ngo-management-page";
import KitchenOrdersQueuePage from "@/pages/kitchen/orders-queue-page";
import KitchenSurplusManagementPage from "@/pages/kitchen/surplus-management-page";
import DemoPaymentPage from "@/pages/demo-payment-page";
import PaymentCompletePage from "@/pages/payment-complete-page";
import PaymentSuccessPage from "@/pages/payment-success-page";
import PaymentFailedPage from "@/pages/payment-failed-page";
import QrCodePaymentPage from "@/pages/pay/qr-code-page";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";
import { CartProvider } from "./hooks/use-cart";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={LandingPage} />
      <Route path="/auth" component={AuthPage} />
      
      {/* Dashboard route - authenticated users */}
      <ProtectedRoute path="/dashboard" component={HomePage} />
      
      {/* User routes */}
      <ProtectedRoute path="/menu" component={MenuPage} roles={["student"]} />
      <ProtectedRoute path="/checkout" component={CheckoutPage} roles={["student"]} />
      <ProtectedRoute path="/orders" component={OrdersPage} roles={["student"]} />
      <ProtectedRoute path="/loyalty" component={LoyaltyPage} roles={["student"]} />
      <ProtectedRoute path="/surplus-deals" component={SurplusDealsPage} roles={["student"]} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      
      {/* Admin routes */}
      <ProtectedRoute path="/admin/dashboard" component={AdminDashboardPage} roles={["admin"]} />
      <ProtectedRoute path="/admin/menu" component={AdminMenuManagementPage} roles={["admin"]} />
      <ProtectedRoute path="/admin/orders" component={OrdersPage} roles={["admin"]} />
      <ProtectedRoute path="/admin/loyalty" component={LoyaltyManagementPage} roles={["admin"]} />
      <ProtectedRoute path="/admin/ngo-partners" component={NgoManagementPage} roles={["admin"]} />
      
      {/* Kitchen routes */}
      <ProtectedRoute path="/kitchen/orders" component={KitchenOrdersQueuePage} roles={["kitchen"]} />
      <ProtectedRoute path="/kitchen/surplus" component={KitchenSurplusManagementPage} roles={["kitchen"]} />
      
      {/* Payment routes - public so they're accessible during payment flow */}
      <Route path="/demo-payment" component={DemoPaymentPage} />
      <Route path="/payment-complete" component={PaymentCompletePage} />
      <Route path="/payment-success" component={PaymentSuccessPage} />
      <Route path="/payment-failed" component={PaymentFailedPage} />
      <Route path="/pay/qr-code/:orderId" component={QrCodePaymentPage} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <Router />
          <Toaster />
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
