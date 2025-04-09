import { User, InsertUser, Category, InsertCategory, MenuItem, InsertMenuItem, Order, InsertOrder, OrderItem, InsertOrderItem, Review, InsertReview, MenuItemWithCategory, OrderWithItems, LoyaltyReward, InsertLoyaltyReward, RewardRedemption, InsertRedemption } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { Decimal } from "decimal.js";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // Session store
  sessionStore: session.Store;
  
  // User methods
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<Omit<InsertUser, 'password'>>): Promise<User | undefined>;
  
  // Category methods
  getCategories(): Promise<Category[]>;
  getCategoryById(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Menu item methods
  getMenuItems(): Promise<MenuItem[]>;
  getMenuItemsWithCategories(): Promise<MenuItemWithCategory[]>;
  getMenuItemById(id: number): Promise<MenuItem | undefined>;
  createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, menuItem: Partial<InsertMenuItem>): Promise<MenuItem | undefined>;
  deleteMenuItem(id: number): Promise<boolean>;
  
  // Order methods
  getOrders(): Promise<Order[]>;
  getOrderById(id: number): Promise<Order | undefined>;
  getOrdersByUserId(userId: number): Promise<Order[]>;
  getOrderWithItems(orderId: number): Promise<OrderWithItems | undefined>;
  createOrder(order: InsertOrder, items: { menuItemId: number; quantity: number; price: number }[]): Promise<Order>;
  updateOrder(id: number, updates: { specialInstructions?: string, items: { menuItemId: number; quantity: number; price: number }[] }): Promise<Order | undefined>;
  updateOrderStatus(id: number, status: Order['status']): Promise<Order | undefined>;
  
  // Order item methods
  getOrderItemsByOrderId(orderId: number): Promise<OrderItem[]>;
  
  // Review methods
  getReviewsByMenuItemId(menuItemId: number): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  updateMenuItemRating(menuItemId: number): Promise<void>;
  
  // Loyalty Program methods
  getLoyaltyRewards(): Promise<LoyaltyReward[]>;
  getLoyaltyRewardById(id: number): Promise<LoyaltyReward | undefined>;
  createLoyaltyReward(reward: InsertLoyaltyReward): Promise<LoyaltyReward>;
  updateLoyaltyReward(id: number, reward: Partial<InsertLoyaltyReward>): Promise<LoyaltyReward | undefined>;
  
  // User Loyalty methods
  getUserLoyaltyPoints(userId: number): Promise<number>;
  addUserLoyaltyPoints(userId: number, points: number): Promise<number>;
  redeemUserLoyaltyPoints(userId: number, points: number): Promise<boolean>;
  getUserRedemptions(userId: number): Promise<RewardRedemption[]>;
  createRedemption(redemption: InsertRedemption): Promise<RewardRedemption>;
  
  // NGO Partner methods
  getNgoPartners(): Promise<NgoPartner[]>;
  getNgoPartnerById(id: number): Promise<NgoPartner | undefined>;
  createNgoPartner(partner: InsertNgoPartner): Promise<NgoPartner>;
  updateNgoPartner(id: number, partner: Partial<InsertNgoPartner>): Promise<NgoPartner | undefined>;
  
  // Surplus Food methods
  markItemAsSurplus(menuItemId: number, surplusData: { 
    surplusPrice: number;
    surplusExpiryTime: Date;
    surplusQuantity: number;
  }): Promise<MenuItem | undefined>;
  getSurplusItems(): Promise<MenuItem[]>;
  
  // Surplus Donation methods
  createSurplusDonation(donation: InsertSurplusDonation): Promise<SurplusDonation>;
  getSurplusDonationsByNgoId(ngoId: number): Promise<SurplusDonation[]>;
  updateSurplusDonationStatus(id: number, status: string): Promise<SurplusDonation | undefined>;
  
  // Notification methods
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: number): Promise<Notification[]>;
  markNotificationAsRead(id: number): Promise<Notification | undefined>;
  deleteExpiredNotifications(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private categories: Map<number, Category>;
  private menuItems: Map<number, MenuItem>;
  private orders: Map<number, Order>;
  private orderItems: Map<number, OrderItem[]>;
  private reviews: Map<number, Review[]>; // menuItemId -> reviews
  private loyaltyRewards: Map<number, LoyaltyReward>;
  private redemptions: Map<number, RewardRedemption[]>; // userId -> redemptions
  private ngoPartners: Map<number, NgoPartner>;
  private surplusDonations: Map<number, SurplusDonation>;
  private notifications: Map<number, Notification[]>; // userId -> notifications
  
  sessionStore: session.Store;
  
  private userIdCounter: number = 1;
  private categoryIdCounter: number = 1;
  private menuItemIdCounter: number = 1;
  private orderIdCounter: number = 1;
  private orderItemIdCounter: number = 1;
  private reviewIdCounter: number = 1;
  private loyaltyRewardIdCounter: number = 1;
  private redemptionIdCounter: number = 1;
  private ngoPartnerIdCounter: number = 1;
  private surplusDonationIdCounter: number = 1;
  private notificationIdCounter: number = 1;

  constructor() {
    this.users = new Map();
    this.categories = new Map();
    this.menuItems = new Map();
    this.orders = new Map();
    this.orderItems = new Map();
    this.reviews = new Map();
    this.loyaltyRewards = new Map();
    this.redemptions = new Map();
    this.ngoPartners = new Map();
    this.surplusDonations = new Map();
    this.notifications = new Map();
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000
    });
    
    // Initialize with some sample data
    this.initializeData();
  }

  private initializeData() {
    // Add demo users
    const users = [
      {
        username: "student",
        password: "$2b$10$7Gq0QU2RITBtLPzmJOrcquEWfdsMo1kW0BoKXsd1SRcTUsrMAFU7O", // student123
        name: "Student User",
        email: "student@example.com",
        role: "student",
        loyaltyPoints: 100
      },
      {
        username: "admin",
        password: "$2b$10$y.PtQiXa6jw6srVR9sMUxeXpvJQCEd2y1MBthjMl7b4YzE3RM3gFm", // admin123
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
        loyaltyPoints: 0
      },
      {
        username: "kitchen",
        password: "$2b$10$7x67FRaXhUu1yFIrwhqg2O4zxhMehCMcvLfgAsyNO9c7e9bvDkPT2", // kitchen123
        name: "Kitchen Staff",
        email: "kitchen@example.com",
        role: "kitchen",
        loyaltyPoints: 0
      }
    ];
    
    users.forEach(user => {
      this.createUser(user as InsertUser);
    });
    
    // Initialize loyalty rewards
    const loyaltyRewards = [
      {
        name: "10% Discount",
        description: "Get 10% off on your next order",
        pointsRequired: 50,
        rewardType: "discount",
        rewardValue: "10",
        isActive: true
      },
      {
        name: "Free Coffee",
        description: "Enjoy a free coffee with your next order",
        pointsRequired: 75,
        rewardType: "freeItem",
        rewardValue: "Cold Coffee",
        isActive: true
      },
      {
        name: "Special 20% Discount",
        description: "Get 20% off on your next order above ₹200",
        pointsRequired: 150,
        rewardType: "discount",
        rewardValue: "20",
        isActive: true
      },
    ];
    
    loyaltyRewards.forEach(reward => {
      this.createLoyaltyReward(reward as InsertLoyaltyReward);
    });
    
    // Initialize NGO partners
    const ngoPartners = [
      {
        name: "Food For All",
        description: "Organization dedicated to providing meals to underprivileged children",
        contactName: "Rajesh Kumar",
        contactEmail: "rajesh@foodforall.org",
        contactPhone: "9876543210",
        address: "45 Gandhi Road, New Delhi",
        isActive: true
      },
      {
        name: "Campus Hunger Relief",
        description: "University initiative to address food insecurity among students",
        contactName: "Priya Singh",
        contactEmail: "priya@campushunger.org",
        contactPhone: "8765432109",
        address: "University Campus, Building D",
        isActive: true
      },
      {
        name: "Community Kitchen",
        description: "Providing nutritious meals to homeless and low-income families",
        contactName: "Amar Patil",
        contactEmail: "amar@communitykitchen.org",
        contactPhone: "7654321098",
        address: "12 MG Road, Bangalore",
        isActive: true
      }
    ];
    
    ngoPartners.forEach(partner => {
      this.createNgoPartner(partner as InsertNgoPartner);
    });

    // Add categories
    const categories = [
      { name: "Breakfast" },
      { name: "Lunch" },
      { name: "Snacks" },
      { name: "Beverages" }
    ];
    
    categories.forEach(category => {
      this.createCategory({ name: category.name });
    });
    
    // Add menu items
    const menuItems = [
      {
        name: "Veggie Salad Bowl",
        description: "Fresh mixed vegetables with olive oil dressing and herbs.",
        price: new Decimal(120),
        image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
        categoryId: 2,
        isAvailable: true,
        rating: new Decimal(4.5),
        reviewCount: 24
      },
      {
        name: "Margherita Pizza",
        description: "Traditional pizza with tomato sauce, mozzarella, and fresh basil.",
        price: new Decimal(180),
        image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38",
        categoryId: 2,
        isAvailable: true,
        rating: new Decimal(4.0),
        reviewCount: 36
      },
      {
        name: "Fries with Dips",
        description: "Crispy french fries served with ketchup and mayonnaise.",
        price: new Decimal(90),
        image: "https://images.unsplash.com/photo-1513104890138-7c749659a591",
        categoryId: 3,
        isAvailable: true,
        rating: new Decimal(3.5),
        reviewCount: 18
      },
      {
        name: "Cold Coffee",
        description: "Refreshing cold coffee with ice cream and chocolate syrup.",
        price: new Decimal(70),
        image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87",
        categoryId: 4,
        isAvailable: true,
        rating: new Decimal(4.0),
        reviewCount: 42
      },
      {
        name: "Samosa Plate",
        description: "Two crispy samosas filled with spiced potatoes and peas.",
        price: new Decimal(60),
        image: "https://images.unsplash.com/photo-1619894991209-9f9694be045a",
        categoryId: 3,
        isAvailable: false,
        rating: new Decimal(4.5),
        reviewCount: 56
      },
      {
        name: "Veg Thali",
        description: "Complete meal with roti, rice, dal, sabzi, salad, and dessert.",
        price: new Decimal(150),
        image: "https://images.unsplash.com/photo-1606491956689-2ea866880c84",
        categoryId: 2,
        isAvailable: true,
        rating: new Decimal(5.0),
        reviewCount: 32
      }
    ];
    
    menuItems.forEach(item => {
      const menuItem = {
        name: item.name,
        description: item.description,
        price: item.price,
        image: item.image,
        categoryId: item.categoryId,
        isAvailable: item.isAvailable
      };
      
      const createdItem = this.createMenuItem(menuItem);
      // Set rating and review count manually
      const storedItem = this.menuItems.get(createdItem.id);
      if (storedItem) {
        storedItem.rating = item.rating;
        storedItem.reviewCount = item.reviewCount;
      }
    });
  }

  // User methods
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const newUser = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUser(id: number, updates: Partial<Omit<InsertUser, 'password'>>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      return undefined;
    }
    
    const updatedUser = { ...existingUser, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Category methods
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async getCategoryById(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const id = this.categoryIdCounter++;
    const newCategory = { ...category, id };
    this.categories.set(id, newCategory);
    return newCategory;
  }

  // Menu item methods
  async getMenuItems(): Promise<MenuItem[]> {
    return Array.from(this.menuItems.values());
  }

  async getMenuItemsWithCategories(): Promise<MenuItemWithCategory[]> {
    const menuItems = await this.getMenuItems();
    const categories = await this.getCategories();
    
    return menuItems.map(menuItem => {
      const category = categories.find(c => c.id === menuItem.categoryId);
      return {
        ...menuItem,
        category: category!
      };
    });
  }

  async getMenuItemById(id: number): Promise<MenuItem | undefined> {
    return this.menuItems.get(id);
  }

  async createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem> {
    const id = this.menuItemIdCounter++;
    const newMenuItem = { 
      ...menuItem, 
      id, 
      rating: new Decimal(0), 
      reviewCount: 0 
    };
    this.menuItems.set(id, newMenuItem);
    return newMenuItem;
  }

  async updateMenuItem(id: number, menuItem: Partial<InsertMenuItem>): Promise<MenuItem | undefined> {
    const existingMenuItem = this.menuItems.get(id);
    if (!existingMenuItem) {
      return undefined;
    }
    
    const updatedMenuItem = { ...existingMenuItem, ...menuItem };
    this.menuItems.set(id, updatedMenuItem);
    return updatedMenuItem;
  }

  async deleteMenuItem(id: number): Promise<boolean> {
    return this.menuItems.delete(id);
  }

  // Order methods
  async getOrders(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }

  async getOrderById(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getOrdersByUserId(userId: number): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(
      order => order.userId === userId
    );
  }

  async getOrderWithItems(orderId: number): Promise<OrderWithItems | undefined> {
    const order = await this.getOrderById(orderId);
    if (!order) return undefined;
    
    const user = await this.getUser(order.userId);
    if (!user) return undefined;
    
    const orderItems = await this.getOrderItemsByOrderId(orderId);
    const items = await Promise.all(orderItems.map(async item => {
      const menuItem = await this.getMenuItemById(item.menuItemId);
      return {
        ...item,
        menuItem: menuItem!
      };
    }));
    
    return {
      ...order,
      items,
      user
    };
  }

  async createOrder(order: InsertOrder, items: { menuItemId: number; quantity: number; price: number }[]): Promise<Order> {
    const id = this.orderIdCounter++;
    const newOrder = { 
      ...order, 
      id, 
      status: "placed" as const, 
      createdAt: new Date() 
    };
    this.orders.set(id, newOrder);
    
    // Create order items
    const orderItems = items.map(item => {
      return {
        id: this.orderItemIdCounter++,
        orderId: id,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        price: new Decimal(item.price)
      };
    });
    
    this.orderItems.set(id, orderItems);
    
    return newOrder;
  }

  async updateOrder(id: number, updates: { specialInstructions?: string, items: { menuItemId: number; quantity: number; price: number }[] }): Promise<Order | undefined> {
    const existingOrder = this.orders.get(id);
    if (!existingOrder) {
      return undefined;
    }
    
    // Only allow updates to orders in "placed" status
    if (existingOrder.status !== "placed") {
      return undefined;
    }
    
    // Calculate new total amount
    const totalAmount = updates.items.reduce(
      (sum, item) => sum + (item.price * item.quantity), 
      0
    );
    
    // Update order
    const updatedOrder = { 
      ...existingOrder,
      specialInstructions: updates.specialInstructions ?? existingOrder.specialInstructions,
      totalAmount: new Decimal(totalAmount)
    };
    
    this.orders.set(id, updatedOrder);
    
    // Update order items
    const orderItems = updates.items.map(item => {
      return {
        id: this.orderItemIdCounter++,
        orderId: id,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        price: new Decimal(item.price)
      };
    });
    
    this.orderItems.set(id, orderItems);
    
    return updatedOrder;
  }
  
  async updateOrderStatus(id: number, status: Order['status']): Promise<Order | undefined> {
    const existingOrder = this.orders.get(id);
    if (!existingOrder) {
      return undefined;
    }
    
    const updatedOrder = { ...existingOrder, status };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  // Order item methods
  async getOrderItemsByOrderId(orderId: number): Promise<OrderItem[]> {
    return this.orderItems.get(orderId) || [];
  }

  // Review methods
  async getReviewsByMenuItemId(menuItemId: number): Promise<Review[]> {
    return this.reviews.get(menuItemId) || [];
  }

  async createReview(review: InsertReview): Promise<Review> {
    const id = this.reviewIdCounter++;
    const newReview = { ...review, id, createdAt: new Date() };
    
    // Get existing reviews for the menu item
    const existingReviews = this.reviews.get(review.menuItemId) || [];
    
    // Add new review
    this.reviews.set(review.menuItemId, [...existingReviews, newReview]);
    
    // Update menu item rating
    await this.updateMenuItemRating(review.menuItemId);
    
    return newReview;
  }

  async updateMenuItemRating(menuItemId: number): Promise<void> {
    const menuItem = await this.getMenuItemById(menuItemId);
    if (!menuItem) return;
    
    const reviews = await this.getReviewsByMenuItemId(menuItemId);
    if (reviews.length === 0) return;
    
    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = new Decimal(totalRating / reviews.length).toFixed(1);
    
    // Update menu item
    await this.updateMenuItem(menuItemId, { 
      rating: new Decimal(averageRating),
      reviewCount: reviews.length
    });
  }
  
  // Loyalty Program methods
  async getLoyaltyRewards(): Promise<LoyaltyReward[]> {
    return Array.from(this.loyaltyRewards.values());
  }
  
  async getLoyaltyRewardById(id: number): Promise<LoyaltyReward | undefined> {
    return this.loyaltyRewards.get(id);
  }
  
  async createLoyaltyReward(reward: InsertLoyaltyReward): Promise<LoyaltyReward> {
    const id = this.loyaltyRewardIdCounter++;
    const newReward = { ...reward, id };
    this.loyaltyRewards.set(id, newReward);
    return newReward;
  }
  
  async updateLoyaltyReward(id: number, reward: Partial<InsertLoyaltyReward>): Promise<LoyaltyReward | undefined> {
    const existingReward = this.loyaltyRewards.get(id);
    if (!existingReward) {
      return undefined;
    }
    
    const updatedReward = { ...existingReward, ...reward };
    this.loyaltyRewards.set(id, updatedReward);
    return updatedReward;
  }
  
  // User Loyalty methods
  async getUserLoyaltyPoints(userId: number): Promise<number> {
    const user = await this.getUser(userId);
    return user?.loyaltyPoints || 0;
  }
  
  async addUserLoyaltyPoints(userId: number, points: number): Promise<number> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    const updatedPoints = (user.loyaltyPoints || 0) + points;
    user.loyaltyPoints = updatedPoints;
    
    return updatedPoints;
  }
  
  async redeemUserLoyaltyPoints(userId: number, points: number): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user || !user.loyaltyPoints || user.loyaltyPoints < points) {
      return false;
    }
    
    user.loyaltyPoints -= points;
    return true;
  }
  
  async getUserRedemptions(userId: number): Promise<RewardRedemption[]> {
    return this.redemptions.get(userId) || [];
  }
  
  async createRedemption(redemption: InsertRedemption): Promise<RewardRedemption> {
    const id = this.redemptionIdCounter++;
    const newRedemption = { 
      ...redemption, 
      id, 
      redeemedAt: new Date(),
      status: "pending" as const
    };
    
    // Get existing redemptions for the user
    const existingRedemptions = this.redemptions.get(redemption.userId) || [];
    
    // Add new redemption
    this.redemptions.set(redemption.userId, [...existingRedemptions, newRedemption]);
    
    // Deduct points from user
    await this.redeemUserLoyaltyPoints(redemption.userId, redemption.pointsUsed);
    
    return newRedemption;
  }

  // NGO Partner methods
  async getNgoPartners(): Promise<NgoPartner[]> {
    return Array.from(this.ngoPartners.values());
  }
  
  async getNgoPartnerById(id: number): Promise<NgoPartner | undefined> {
    return this.ngoPartners.get(id);
  }
  
  async createNgoPartner(partner: InsertNgoPartner): Promise<NgoPartner> {
    const id = this.ngoPartnerIdCounter++;
    const newPartner = { 
      ...partner, 
      id, 
      createdAt: new Date()
    };
    this.ngoPartners.set(id, newPartner);
    return newPartner;
  }
  
  async updateNgoPartner(id: number, partner: Partial<InsertNgoPartner>): Promise<NgoPartner | undefined> {
    const existingPartner = this.ngoPartners.get(id);
    if (!existingPartner) {
      return undefined;
    }
    
    const updatedPartner = { ...existingPartner, ...partner };
    this.ngoPartners.set(id, updatedPartner);
    return updatedPartner;
  }
  
  // Surplus Food methods
  async markItemAsSurplus(menuItemId: number, surplusData: { 
    surplusPrice: number;
    surplusExpiryTime: Date;
    surplusQuantity: number;
  }): Promise<MenuItem | undefined> {
    const menuItem = await this.getMenuItemById(menuItemId);
    if (!menuItem) {
      return undefined;
    }
    
    const updatedMenuItem = { 
      ...menuItem, 
      isSurplus: true,
      surplusPrice: new Decimal(surplusData.surplusPrice),
      surplusExpiryTime: surplusData.surplusExpiryTime,
      surplusQuantity: surplusData.surplusQuantity
    };
    
    this.menuItems.set(menuItemId, updatedMenuItem);
    
    // Create notifications for students about the surplus food
    const students = Array.from(this.users.values()).filter(user => user.role === 'student');
    
    students.forEach(student => {
      this.createNotification({
        userId: student.id,
        title: 'Flash Sale!',
        message: `${menuItem.name} now available at a discounted price of ₹${surplusData.surplusPrice}! Limited quantity available.`,
        type: 'surplus',
        relatedItemId: menuItemId,
        expiresAt: surplusData.surplusExpiryTime
      });
    });
    
    return updatedMenuItem;
  }
  
  async getSurplusItems(): Promise<MenuItem[]> {
    return Array.from(this.menuItems.values()).filter(item => item.isSurplus && item.surplusQuantity > 0);
  }
  
  // Surplus Donation methods
  async createSurplusDonation(donation: InsertSurplusDonation): Promise<SurplusDonation> {
    const id = this.surplusDonationIdCounter++;
    const newDonation = { 
      ...donation, 
      id, 
      donationDate: new Date(),
      status: "scheduled" as const
    };
    
    this.surplusDonations.set(id, newDonation);
    
    // Update the menu item's surplus quantity
    const menuItem = await this.getMenuItemById(donation.menuItemId);
    if (menuItem && menuItem.surplusQuantity >= donation.quantity) {
      menuItem.surplusQuantity -= donation.quantity;
      
      // If no surplus items left, mark as not surplus
      if (menuItem.surplusQuantity <= 0) {
        menuItem.isSurplus = false;
      }
      
      this.menuItems.set(menuItem.id, menuItem);
    }
    
    // Notify kitchen staff about the donation
    const kitchenStaff = Array.from(this.users.values()).filter(user => user.role === 'kitchen');
    
    kitchenStaff.forEach(staff => {
      this.createNotification({
        userId: staff.id,
        title: 'New Surplus Donation',
        message: `A new donation has been scheduled for NGO. Please prepare ${donation.quantity} portions of menu item #${donation.menuItemId}.`,
        type: 'general',
        relatedItemId: donation.menuItemId
      });
    });
    
    return newDonation;
  }
  
  async getSurplusDonationsByNgoId(ngoId: number): Promise<SurplusDonation[]> {
    return Array.from(this.surplusDonations.values()).filter(donation => donation.ngoId === ngoId);
  }
  
  async updateSurplusDonationStatus(id: number, status: string): Promise<SurplusDonation | undefined> {
    const donation = this.surplusDonations.get(id);
    if (!donation) {
      return undefined;
    }
    
    const updatedDonation = { ...donation, status: status as SurplusDonation['status'] };
    this.surplusDonations.set(id, updatedDonation);
    
    // Notify admin about the status update
    const admins = Array.from(this.users.values()).filter(user => user.role === 'admin');
    
    admins.forEach(admin => {
      this.createNotification({
        userId: admin.id,
        title: 'Donation Status Update',
        message: `Donation #${id} status has been updated to ${status}.`,
        type: 'general',
        relatedItemId: id
      });
    });
    
    return updatedDonation;
  }
  
  // Notification methods
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const id = this.notificationIdCounter++;
    const newNotification = { 
      ...notification, 
      id, 
      isRead: false,
      createdAt: new Date() 
    };
    
    // Get existing notifications for the user
    const existingNotifications = this.notifications.get(notification.userId) || [];
    
    // Add new notification
    this.notifications.set(notification.userId, [...existingNotifications, newNotification]);
    
    return newNotification;
  }
  
  async getUserNotifications(userId: number): Promise<Notification[]> {
    return (this.notifications.get(userId) || []).sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }
  
  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    // Find the notification in all user notification arrays
    for (const [userId, notifications] of this.notifications.entries()) {
      const notificationIndex = notifications.findIndex(n => n.id === id);
      
      if (notificationIndex !== -1) {
        const notification = notifications[notificationIndex];
        const updatedNotification = { ...notification, isRead: true };
        
        // Replace the notification in the array
        notifications[notificationIndex] = updatedNotification;
        
        // Update the notifications map
        this.notifications.set(userId, notifications);
        
        return updatedNotification;
      }
    }
    
    return undefined;
  }
  
  async deleteExpiredNotifications(): Promise<void> {
    const now = new Date();
    
    // For each user's notifications
    for (const [userId, notifications] of this.notifications.entries()) {
      // Filter out expired notifications
      const validNotifications = notifications.filter(notification => 
        !notification.expiresAt || notification.expiresAt > now
      );
      
      // Update the notifications map if any were removed
      if (validNotifications.length !== notifications.length) {
        this.notifications.set(userId, validNotifications);
      }
    }
  }
}

export const storage = new MemStorage();
