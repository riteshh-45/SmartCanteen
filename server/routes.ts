import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage-config"; // Use the new storage config
import { setupWebSocket, WebSocketService } from "./websocket";
import { phonePeService } from "./services/phonepe-service";
import { z } from "zod";
import { 
  insertMenuItemSchema, 
  insertOrderSchema, 
  insertReviewSchema,
  insertLoyaltyRewardSchema,
  insertRedemptionSchema,
  insertNgoPartnerSchema,
  insertSurplusDonationSchema,
  insertNotificationSchema
} from "@shared/schema";

let wsService: WebSocketService;

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // Create HTTP server
  const httpServer = createServer(app);
  
  // Set up WebSocket server
  wsService = setupWebSocket(httpServer);

  // API Routes
  // 1. Menu Items
  app.get("/api/menu-items", async (req, res) => {
    try {
      const menuItems = await storage.getMenuItemsWithCategories();
      res.json(menuItems);
    } catch (error) {
      res.status(500).json({ message: "Error fetching menu items" });
    }
  });

  app.get("/api/menu-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const menuItem = await storage.getMenuItemById(id);
      
      if (!menuItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      
      res.json(menuItem);
    } catch (error) {
      res.status(500).json({ message: "Error fetching menu item" });
    }
  });

  // 2. Categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Error fetching categories" });
    }
  });

  // 3. Orders
  app.get("/api/orders", isAuthenticated, async (req, res) => {
    try {
      let orders;
      
      if (req.user.role === "admin" || req.user.role === "kitchen") {
        // Admin and kitchen staff can see all orders
        orders = await storage.getOrders();
      } else {
        // Regular users can only see their own orders
        orders = await storage.getOrdersByUserId(req.user.id);
      }
      
      // Fetch full order details with items for each order
      const ordersWithItems = await Promise.all(
        orders.map(order => storage.getOrderWithItems(order.id))
      );
      
      res.json(ordersWithItems.filter(Boolean));
    } catch (error) {
      res.status(500).json({ message: "Error fetching orders" });
    }
  });

  app.get("/api/orders/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const order = await storage.getOrderWithItems(id);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Check if user is authorized to view this order
      if (req.user.role !== "admin" && req.user.role !== "kitchen" && order.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to view this order" });
      }
      
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Error fetching order" });
    }
  });

  app.post("/api/orders", isAuthenticated, async (req, res) => {
    try {
      // Validate user
      if (req.user.role !== "student") {
        return res.status(403).json({ message: "Only students can place orders" });
      }
      
      // Log the request body for debugging
      console.log("Order request body:", JSON.stringify(req.body));
      
      // Validate request body
      const orderSchema = z.object({
        totalAmount: z.number(),
        items: z.array(z.object({
          menuItemId: z.number(),
          quantity: z.number().min(1),
          price: z.number()
        })),
        isPreorder: z.boolean().optional(),
        pickupTime: z.string().nullable().optional().transform(val => val ? new Date(val) : null),
        specialInstructions: z.string().optional()
      });
      
      const validationResult = orderSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.log("Order validation errors:", JSON.stringify(validationResult.error.errors));
        return res.status(400).json({ message: "Invalid order data", errors: validationResult.error.errors });
      }
      
      const { totalAmount, items, isPreorder, pickupTime, specialInstructions } = validationResult.data;
      
      // Create order
      const order = await storage.createOrder(
        { 
          userId: req.user.id, 
          totalAmount,
          isPreorder: isPreorder || false,
          pickupTime, 
          specialInstructions
        },
        items
      );
      
      // Notify kitchen staff about new order
      wsService.sendNewOrderToKitchen(order.id);
      
      res.status(201).json(order);
    } catch (error) {
      res.status(500).json({ message: "Error creating order" });
    }
  });

  app.patch("/api/orders/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get existing order
      const existingOrder = await storage.getOrderWithItems(id);
      
      if (!existingOrder) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Check if user is authorized to edit this order
      if (existingOrder.userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Not authorized to edit this order" });
      }
      
      // Check if order is in "placed" status
      if (existingOrder.status !== "placed") {
        return res.status(400).json({ 
          message: "Cannot edit order that is already being prepared",
          status: existingOrder.status
        });
      }
      
      // Validate request body
      const updateSchema = z.object({
        specialInstructions: z.string().optional(),
        items: z.array(
          z.object({
            menuItemId: z.number(),
            quantity: z.number().min(1),
            price: z.number()
          })
        ).nonempty()
      });
      
      const validationResult = updateSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid order data", 
          errors: validationResult.error.errors 
        });
      }
      
      // Update order
      const updatedOrder = await storage.updateOrder(id, validationResult.data);
      
      if (!updatedOrder) {
        return res.status(500).json({ message: "Failed to update order" });
      }
      
      // Get updated order with items
      const orderWithItems = await storage.getOrderWithItems(id);
      
      res.json(orderWithItems);
    } catch (error) {
      res.status(500).json({ message: "Error updating order" });
    }
  });

  app.patch("/api/orders/:id/status", isAuthenticated, async (req, res) => {
    try {
      // Validate user role
      if (req.user.role !== "admin" && req.user.role !== "kitchen") {
        return res.status(403).json({ message: "Not authorized to update order status" });
      }
      
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      // Validate status
      const validStatuses = ["placed", "preparing", "ready", "completed", "cancelled"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      // Update order status
      const updatedOrder = await storage.updateOrderStatus(id, status);
      
      if (!updatedOrder) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Get the order with items
      const orderWithItems = await storage.getOrderWithItems(id);
      
      if (!orderWithItems) {
        return res.status(404).json({ message: "Order details not found" });
      }
      
      // Notify user about order status update
      wsService.sendOrderUpdate(orderWithItems.userId, {
        id: orderWithItems.id,
        status: orderWithItems.status,
        items: orderWithItems.items.map(item => ({
          name: item.menuItem.name,
          quantity: item.quantity
        }))
      });
      
      res.json(updatedOrder);
    } catch (error) {
      res.status(500).json({ message: "Error updating order status" });
    }
  });

  // 4. Admin Routes
  app.post("/api/menu-items", isAdmin, async (req, res) => {
    try {
      // Log the request body for debugging
      console.log("Menu item request body:", JSON.stringify(req.body));
      
      const validationResult = insertMenuItemSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.log("Menu item validation errors:", JSON.stringify(validationResult.error.errors));
        return res.status(400).json({ message: "Invalid menu item data", errors: validationResult.error.errors });
      }
      
      const menuItem = await storage.createMenuItem(validationResult.data);
      res.status(201).json(menuItem);
    } catch (error) {
      res.status(500).json({ message: "Error creating menu item" });
    }
  });

  app.patch("/api/menu-items/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if menu item exists
      const existingMenuItem = await storage.getMenuItemById(id);
      if (!existingMenuItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      
      // Validate partial update data
      const menuItemUpdateSchema = insertMenuItemSchema.partial();
      const validationResult = menuItemUpdateSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid menu item data", errors: validationResult.error.errors });
      }
      
      // Update menu item
      const updatedMenuItem = await storage.updateMenuItem(id, validationResult.data);
      res.json(updatedMenuItem);
    } catch (error) {
      res.status(500).json({ message: "Error updating menu item" });
    }
  });

  app.delete("/api/menu-items/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if menu item exists
      const existingMenuItem = await storage.getMenuItemById(id);
      if (!existingMenuItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      
      // Delete menu item
      await storage.deleteMenuItem(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting menu item" });
    }
  });

  // 5. Reviews
  app.post("/api/reviews", isAuthenticated, async (req, res) => {
    try {
      const validationResult = insertReviewSchema.safeParse({
        ...req.body,
        userId: req.user.id
      });
      
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid review data", errors: validationResult.error.errors });
      }
      
      const review = await storage.createReview(validationResult.data);
      res.status(201).json(review);
    } catch (error) {
      res.status(500).json({ message: "Error creating review" });
    }
  });

  app.get("/api/menu-items/:id/reviews", async (req, res) => {
    try {
      const menuItemId = parseInt(req.params.id);
      
      // Check if menu item exists
      const existingMenuItem = await storage.getMenuItemById(menuItemId);
      if (!existingMenuItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      
      const reviews = await storage.getReviewsByMenuItemId(menuItemId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: "Error fetching reviews" });
    }
  });

  // 6. Dashboard Stats (Admin only)
  app.get("/api/admin/stats", isAdmin, async (req, res) => {
    try {
      const orders = await storage.getOrders();
      const menuItems = await storage.getMenuItems();
      const users = Array.from((storage as any).users.values());
      
      // Calculate stats
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const todayOrders = orders.filter(order => new Date(order.createdAt) >= todayStart);
      
      const todayRevenue = todayOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
      
      const activeOrders = orders.filter(order => 
        order.status === "placed" || order.status === "preparing" || order.status === "ready"
      );
      
      const availableItems = menuItems.filter(item => item.isAvailable);
      
      const stats = {
        todayOrders: todayOrders.length,
        todayRevenue,
        activeOrders: activeOrders.length,
        totalCustomers: users.filter((user: any) => user.role === "student").length,
        availableItems: availableItems.length,
        totalItems: menuItems.length
      };
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Error fetching admin stats" });
    }
  });
  
  // 7. Payment simulation endpoints
  app.post("/api/payments/create-order", isAuthenticated, async (req, res) => {
    try {
      const { amount, orderId } = req.body;
      
      if (!amount || !orderId) {
        return res.status(400).json({ 
          message: "Invalid request. Amount and orderId are required." 
        });
      }
      
      // Create a simulated Razorpay order
      const paymentOrder = {
        id: "order_" + Date.now() + Math.floor(Math.random() * 1000),
        amount: amount * 100, // Razorpay uses amount in smallest currency unit (paise)
        currency: "INR",
        receipt: `receipt_${orderId}`,
        status: "created",
        created_at: new Date().toISOString()
      };
      
      res.json({
        id: paymentOrder.id,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        receipt: paymentOrder.receipt
      });
    } catch (error) {
      res.status(500).json({ message: "Error creating payment order" });
    }
  });
  
  app.post("/api/payments/verify", isAuthenticated, async (req, res) => {
    try {
      const { orderId, paymentId, signature } = req.body;
      
      if (!orderId || !paymentId) {
        return res.status(400).json({ 
          message: "Invalid request. OrderId and paymentId are required." 
        });
      }
      
      // For a simulation, we'll always consider the payment as successful
      // In a real implementation, this would verify the signature
      
      // Get the order ID from the receipt (remove 'receipt_' prefix)
      const canteenOrderId = parseInt(orderId.replace('receipt_', ''));
      
      // Update the order status to indicate payment was successful
      const order = await storage.getOrderById(canteenOrderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // In a real implementation, you would update a payment status field
      // Since our order model doesn't have a payment status, we'll just return success
      
      // Award loyalty points (10% of order amount rounded down to nearest integer)
      if (req.user && req.user.role === 'student') {
        const pointsToAward = Math.floor(Number(order.totalAmount) * 0.1);
        await storage.addUserLoyaltyPoints(req.user.id, pointsToAward);
      }
      
      res.json({
        success: true,
        message: "Payment verified successfully"
      });
    } catch (error) {
      res.status(500).json({ message: "Error verifying payment" });
    }
  });
  
  // PhonePe Payment Gateway Integration
  app.post("/api/phonepe/create-payment", isAuthenticated, async (req, res) => {
    try {
      const { amount, orderId } = req.body;
      
      if (!amount || !orderId) {
        return res.status(400).json({ 
          message: "Invalid request. Amount and orderId are required." 
        });
      }
      
      // Get order details
      const order = await storage.getOrderById(Number(orderId));
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Get user details
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      // Initialize PhonePe payment
      const callbackUrl = `${req.protocol}://${req.get('host')}/api/phonepe/callback`;
      const redirectUrl = `${req.protocol}://${req.get('host')}/payment-complete`;
      const transactionId = `order_${orderId}_${Date.now()}`;
      
      // Create a PhonePe payment using our service
      const payment = await phonePeService.initiatePayment({
        transactionId,
        amount: Number(amount),
        userId: user.id.toString(),
        redirectUrl,
        callbackUrl
      });
      
      res.json({
        success: true,
        redirectUrl: payment.paymentUrl,
        transactionId: payment.transactionId
      });
    } catch (error) {
      console.error("PhonePe payment creation error:", error);
      res.status(500).json({ message: "Error creating PhonePe payment" });
    }
  });
  
  app.post("/api/phonepe/verify", isAuthenticated, async (req, res) => {
    try {
      const { transactionId } = req.body;
      
      if (!transactionId) {
        return res.status(400).json({ 
          message: "Invalid request. TransactionId is required." 
        });
      }
      
      // Check payment status with PhonePe
      const verification = await phonePeService.checkPaymentStatus(transactionId);
      
      if (!verification.success) {
        return res.status(500).json({
          message: "PhonePe payment verification failed",
          error: verification.message
        });
      }
      
      // Extract order ID from transaction ID (order_ID_timestamp)
      const orderIdMatch = transactionId.match(/order_(\d+)_/);
      if (!orderIdMatch) {
        return res.status(400).json({ message: "Invalid transaction ID format" });
      }
      
      const canteenOrderId = parseInt(orderIdMatch[1]);
      
      // Get the order
      const order = await storage.getOrderById(canteenOrderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Award loyalty points (10% of order amount rounded down to nearest integer)
      if (req.user && req.user.role === 'student') {
        const pointsToAward = Math.floor(Number(order.totalAmount) * 0.1);
        await storage.addUserLoyaltyPoints(req.user.id, pointsToAward);
      }
      
      res.json({
        success: true,
        message: "PhonePe payment verified successfully",
        paymentId: verification.data.transactionId,
        status: verification.data.state
      });
    } catch (error) {
      console.error("PhonePe payment verification error:", error);
      res.status(500).json({ message: "Error verifying PhonePe payment" });
    }
  });
  
  // Public callback endpoint for PhonePe
  app.get("/api/phonepe/callback", async (req, res) => {
    try {
      const { transactionId } = req.query;
      
      if (!transactionId) {
        return res.redirect('/payment-failed');
      }
      
      // Verify the payment status with PhonePe
      const verification = await phonePeService.checkPaymentStatus(transactionId as string);
      
      // Verify the payment based on the status response
      if (verification.success && verification.data.state === 'COMPLETED') {
        // Extract order ID from transaction ID (order_ID_timestamp)
        const orderIdMatch = (transactionId as string).match(/order_(\d+)_/);
        if (!orderIdMatch) {
          return res.redirect('/payment-failed');
        }
        
        const canteenOrderId = parseInt(orderIdMatch[1]);
        
        // In a real implementation, you'd update the order status here
        // The award of loyalty points happens in the /verify endpoint
        
        res.redirect('/payment-success');
      } else {
        res.redirect('/payment-failed');
      }
    } catch (error) {
      console.error("PhonePe callback error:", error);
      res.redirect('/payment-failed');
    }
  });
  
  // 8. Loyalty Program Routes
  app.get("/api/loyalty/points", isAuthenticated, async (req, res) => {
    try {
      if (req.user.role !== 'student') {
        return res.status(403).json({ message: "Only students can access loyalty points" });
      }
      
      const points = await storage.getUserLoyaltyPoints(req.user.id);
      res.json({ points });
    } catch (error) {
      res.status(500).json({ message: "Error fetching loyalty points" });
    }
  });
  
  app.get("/api/loyalty/rewards", async (req, res) => {
    try {
      const rewards = await storage.getLoyaltyRewards();
      res.json(rewards);
    } catch (error) {
      res.status(500).json({ message: "Error fetching loyalty rewards" });
    }
  });
  
  app.get("/api/loyalty/rewards/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const reward = await storage.getLoyaltyRewardById(id);
      
      if (!reward) {
        return res.status(404).json({ message: "Reward not found" });
      }
      
      res.json(reward);
    } catch (error) {
      res.status(500).json({ message: "Error fetching reward" });
    }
  });
  
  app.post("/api/loyalty/redeem", isAuthenticated, async (req, res) => {
    try {
      if (req.user.role !== 'student') {
        return res.status(403).json({ message: "Only students can redeem rewards" });
      }
      
      const { rewardId } = req.body;
      
      if (!rewardId) {
        return res.status(400).json({ message: "Reward ID is required" });
      }
      
      // Get the reward
      const reward = await storage.getLoyaltyRewardById(parseInt(rewardId));
      
      if (!reward) {
        return res.status(404).json({ message: "Reward not found" });
      }
      
      // Check if user has enough points
      const userPoints = await storage.getUserLoyaltyPoints(req.user.id);
      
      if (userPoints < reward.pointsRequired) {
        return res.status(400).json({ 
          message: "Not enough points to redeem this reward",
          required: reward.pointsRequired,
          available: userPoints
        });
      }
      
      // Create redemption
      const redemption = await storage.createRedemption({
        userId: req.user.id,
        rewardId: reward.id,
        pointsUsed: reward.pointsRequired
      });
      
      res.status(201).json({
        redemption,
        remainingPoints: userPoints - reward.pointsRequired
      });
    } catch (error) {
      res.status(500).json({ message: "Error redeeming reward" });
    }
  });
  
  app.get("/api/loyalty/redemptions", isAuthenticated, async (req, res) => {
    try {
      if (req.user.role !== 'student') {
        return res.status(403).json({ message: "Only students can view redemptions" });
      }
      
      const redemptions = await storage.getUserRedemptions(req.user.id);
      res.json(redemptions);
    } catch (error) {
      res.status(500).json({ message: "Error fetching redemptions" });
    }
  });
  
  // Admin routes for loyalty program
  app.post("/api/admin/loyalty/rewards", isAdmin, async (req, res) => {
    try {
      const validationResult = insertLoyaltyRewardSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid reward data", 
          errors: validationResult.error.errors 
        });
      }
      
      const reward = await storage.createLoyaltyReward(validationResult.data);
      res.status(201).json(reward);
    } catch (error) {
      res.status(500).json({ message: "Error creating reward" });
    }
  });
  
  app.patch("/api/admin/loyalty/rewards/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if reward exists
      const existingReward = await storage.getLoyaltyRewardById(id);
      if (!existingReward) {
        return res.status(404).json({ message: "Reward not found" });
      }
      
      // Validate partial update data
      const rewardUpdateSchema = insertLoyaltyRewardSchema.partial();
      const validationResult = rewardUpdateSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid reward data", 
          errors: validationResult.error.errors 
        });
      }
      
      // Update reward
      const updatedReward = await storage.updateLoyaltyReward(id, validationResult.data);
      res.json(updatedReward);
    } catch (error) {
      res.status(500).json({ message: "Error updating reward" });
    }
  });

  // 9. NGO Partners Management (Admin only)
  app.get("/api/ngo-partners", async (req, res) => {
    try {
      const ngoPartners = await storage.getNgoPartners();
      res.json(ngoPartners);
    } catch (error) {
      res.status(500).json({ message: "Error fetching NGO partners" });
    }
  });

  app.get("/api/ngo-partners/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const ngoPartner = await storage.getNgoPartnerById(id);
      
      if (!ngoPartner) {
        return res.status(404).json({ message: "NGO partner not found" });
      }
      
      res.json(ngoPartner);
    } catch (error) {
      res.status(500).json({ message: "Error fetching NGO partner" });
    }
  });

  app.post("/api/ngo-partners", isAdmin, async (req, res) => {
    try {
      const validationResult = insertNgoPartnerSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid NGO partner data", 
          errors: validationResult.error.errors 
        });
      }
      
      const ngoPartner = await storage.createNgoPartner(validationResult.data);
      res.status(201).json(ngoPartner);
    } catch (error) {
      res.status(500).json({ message: "Error creating NGO partner" });
    }
  });

  app.patch("/api/ngo-partners/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if NGO partner exists
      const existingPartner = await storage.getNgoPartnerById(id);
      if (!existingPartner) {
        return res.status(404).json({ message: "NGO partner not found" });
      }
      
      // Validate partial update data
      const ngoPartnerUpdateSchema = insertNgoPartnerSchema.partial();
      const validationResult = ngoPartnerUpdateSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid NGO partner data", 
          errors: validationResult.error.errors 
        });
      }
      
      // Update NGO partner
      const updatedPartner = await storage.updateNgoPartner(id, validationResult.data);
      res.json(updatedPartner);
    } catch (error) {
      res.status(500).json({ message: "Error updating NGO partner" });
    }
  });

  // 10. Surplus Food Management
  app.get("/api/surplus-items", async (req, res) => {
    try {
      const surplusItems = await storage.getSurplusItems();
      const categories = await storage.getCategories();
      
      // Add category information to surplus items
      const surplusItemsWithCategory = surplusItems.map(item => {
        const category = categories.find(c => c.id === item.categoryId);
        return {
          ...item,
          category: category || { id: 0, name: "Unknown" }
        };
      });
      
      res.json(surplusItemsWithCategory);
    } catch (error) {
      res.status(500).json({ message: "Error fetching surplus items" });
    }
  });

  app.post("/api/menu-items/:id/surplus", isAuthenticated, async (req, res) => {
    try {
      // Only kitchen staff and admin can mark items as surplus
      if (req.user.role !== "kitchen" && req.user.role !== "admin") {
        return res.status(403).json({ message: "Not authorized to mark items as surplus" });
      }
      
      const id = parseInt(req.params.id);
      
      // Check if menu item exists
      const menuItem = await storage.getMenuItemById(id);
      if (!menuItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      
      // Validate request body
      const surplusSchema = z.object({
        surplusPrice: z.number().min(1),
        surplusExpiryTime: z.string().transform(val => new Date(val)),
        surplusQuantity: z.number().min(1)
      });
      
      const validationResult = surplusSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid surplus data", 
          errors: validationResult.error.errors 
        });
      }
      
      // Mark item as surplus
      const { surplusPrice, surplusExpiryTime, surplusQuantity } = validationResult.data;
      const surplusItem = await storage.markItemAsSurplus(id, {
        surplusPrice,
        surplusExpiryTime,
        surplusQuantity
      });
      
      if (!surplusItem) {
        return res.status(500).json({ message: "Failed to mark item as surplus" });
      }
      
      // Create notifications for students
      const students = Array.from((storage as any).users.values())
        .filter((user: any) => user.role === "student");
      
      students.forEach(async (student: any) => {
        await storage.createNotification({
          userId: student.id,
          title: "Surplus Food Alert",
          message: `${menuItem.name} is now available at a discounted price of ₹${surplusPrice}!`,
          type: "surplus",
          relatedItemId: id,
          expiryAt: surplusExpiryTime
        });
      });
      
      // Send websocket notification to all connected clients
      wsService.sendToAll({
        type: "SURPLUS_FOOD_ALERT",
        menuItem: {
          id: surplusItem.id,
          name: surplusItem.name,
          price: surplusItem.price,
          surplusPrice: surplusItem.surplusPrice,
          image: surplusItem.image,
          surplusExpiryTime: surplusItem.surplusExpiryTime
        }
      });
      
      res.json(surplusItem);
    } catch (error) {
      res.status(500).json({ message: "Error marking item as surplus" });
    }
  });

  // 11. Surplus Donations
  app.post("/api/surplus-donations", isAuthenticated, async (req, res) => {
    try {
      // Only kitchen staff and admin can create donations
      if (req.user.role !== "kitchen" && req.user.role !== "admin") {
        return res.status(403).json({ message: "Not authorized to create donations" });
      }
      
      const validationResult = insertSurplusDonationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid donation data", 
          errors: validationResult.error.errors 
        });
      }
      
      // Check if menu item exists and is marked as surplus
      const menuItem = await storage.getMenuItemById(validationResult.data.menuItemId);
      if (!menuItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      
      if (!menuItem.isSurplus) {
        return res.status(400).json({ message: "Only surplus items can be donated" });
      }
      
      // Check if NGO partner exists
      const ngoPartner = await storage.getNgoPartnerById(validationResult.data.ngoId);
      if (!ngoPartner) {
        return res.status(404).json({ message: "NGO partner not found" });
      }
      
      const donation = await storage.createSurplusDonation(validationResult.data);
      
      // Create notification for the NGO partner
      // In a real implementation, this would trigger an email or SMS to the NGO
      
      res.status(201).json(donation);
    } catch (error) {
      res.status(500).json({ message: "Error creating donation" });
    }
  });

  app.get("/api/surplus-donations/ngo/:ngoId", isAuthenticated, async (req, res) => {
    try {
      const ngoId = parseInt(req.params.ngoId);
      
      // Check if NGO partner exists
      const ngoPartner = await storage.getNgoPartnerById(ngoId);
      if (!ngoPartner) {
        return res.status(404).json({ message: "NGO partner not found" });
      }
      
      const donations = await storage.getSurplusDonationsByNgoId(ngoId);
      res.json(donations);
    } catch (error) {
      res.status(500).json({ message: "Error fetching donations" });
    }
  });

  app.patch("/api/surplus-donations/:id/status", isAuthenticated, async (req, res) => {
    try {
      // Only kitchen staff and admin can update donation status
      if (req.user.role !== "kitchen" && req.user.role !== "admin") {
        return res.status(403).json({ message: "Not authorized to update donation status" });
      }
      
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      // Validate status
      const validStatuses = ["scheduled", "in_progress", "completed"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      // Update donation status
      const updatedDonation = await storage.updateSurplusDonationStatus(id, status);
      
      if (!updatedDonation) {
        return res.status(404).json({ message: "Donation not found" });
      }
      
      res.json(updatedDonation);
    } catch (error) {
      res.status(500).json({ message: "Error updating donation status" });
    }
  });

  // 12. Notifications
  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const notifications = await storage.getUserNotifications(req.user.id);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Error fetching notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedNotification = await storage.markNotificationAsRead(id);
      
      if (!updatedNotification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      res.json(updatedNotification);
    } catch (error) {
      res.status(500).json({ message: "Error marking notification as read" });
    }
  });

  return httpServer;
}

// Middleware for checking authentication
function isAuthenticated(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

// Middleware for checking admin role
function isAdmin(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated() && req.user.role === "admin") {
    return next();
  }
  res.status(403).json({ message: "Access forbidden" });
}
