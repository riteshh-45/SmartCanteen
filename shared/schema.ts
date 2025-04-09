import { pgTable, text, serial, integer, decimal, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role", { enum: ["student", "admin", "kitchen"] }).notNull().default("student"),
  loyaltyPoints: integer("loyalty_points").notNull().default(0),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  role: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Menu category model
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
});

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

// Menu item model
export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  image: text("image").notNull(),
  categoryId: integer("category_id").notNull(),
  isAvailable: boolean("is_available").notNull().default(true),
  rating: decimal("rating", { precision: 3, scale: 1 }).default("0"),
  reviewCount: integer("review_count").default(0),
  nutritionalInfo: jsonb("nutritional_info"),
  allergens: text("allergens").array(),
  isSurplus: boolean("is_surplus").default(false),
  surplusPrice: decimal("surplus_price", { precision: 10, scale: 2 }),
  surplusExpiryTime: timestamp("surplus_expiry_time"),
  surplusQuantity: integer("surplus_quantity").default(0),
});

export const insertMenuItemSchema = createInsertSchema(menuItems).pick({
  name: true,
  description: true,
  price: true,
  image: true,
  categoryId: true,
  isAvailable: true,
  nutritionalInfo: true,
  allergens: true,
  isSurplus: true,
  surplusPrice: true,
  surplusExpiryTime: true,
  surplusQuantity: true,
});

export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItem = typeof menuItems.$inferSelect;

// Order model
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  status: text("status", { enum: ["placed", "preparing", "ready", "completed", "cancelled"] }).notNull().default("placed"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isPreorder: boolean("is_preorder").default(false),
  pickupTime: timestamp("pickup_time"),
  specialInstructions: text("special_instructions"),
});

export const insertOrderSchema = createInsertSchema(orders).pick({
  userId: true,
  totalAmount: true,
  isPreorder: true,
  pickupTime: true,
  specialInstructions: true,
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// Order item model
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  menuItemId: integer("menu_item_id").notNull(),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).pick({
  orderId: true,
  menuItemId: true,
  quantity: true,
  price: true,
});

export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;

// Reviews model
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  menuItemId: integer("menu_item_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertReviewSchema = createInsertSchema(reviews).pick({
  userId: true,
  menuItemId: true,
  rating: true,
  comment: true,
});

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

// Extended types for frontend usage
export type CartItem = {
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  isPreorder?: boolean;
};

export type MenuItemWithCategory = MenuItem & {
  category: Category;
};

export type OrderWithItems = Order & {
  items: (OrderItem & { menuItem: MenuItem })[];
  user: User;
};

export type NutritionalInfo = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
};

// Loyalty program rewards model
export const loyaltyRewards = pgTable("loyalty_rewards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  pointsRequired: integer("points_required").notNull(),
  rewardType: text("reward_type", { enum: ["discount", "freeItem", "other"] }).notNull(),
  rewardValue: text("reward_value").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertLoyaltyRewardSchema = createInsertSchema(loyaltyRewards).pick({
  name: true,
  description: true,
  pointsRequired: true,
  rewardType: true,
  rewardValue: true,
  isActive: true,
});

export type InsertLoyaltyReward = z.infer<typeof insertLoyaltyRewardSchema>;
export type LoyaltyReward = typeof loyaltyRewards.$inferSelect;

// User reward redemption history
export const rewardRedemptions = pgTable("reward_redemptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  rewardId: integer("reward_id").notNull(),
  redeemedAt: timestamp("redeemed_at").notNull().defaultNow(),
  pointsUsed: integer("points_used").notNull(),
  status: text("status", { enum: ["pending", "applied", "expired"] }).notNull().default("pending"),
});

export const insertRedemptionSchema = createInsertSchema(rewardRedemptions).pick({
  userId: true,
  rewardId: true,
  pointsUsed: true,
});

export type InsertRedemption = z.infer<typeof insertRedemptionSchema>;
export type RewardRedemption = typeof rewardRedemptions.$inferSelect;

// NGO partners for surplus food donation
export const ngoPartners = pgTable("ngo_partners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone").notNull(),
  address: text("address").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertNgoPartnerSchema = createInsertSchema(ngoPartners).pick({
  name: true,
  description: true,
  contactName: true,
  contactEmail: true,
  contactPhone: true,
  address: true,
  isActive: true,
});

export type InsertNgoPartner = z.infer<typeof insertNgoPartnerSchema>;
export type NgoPartner = typeof ngoPartners.$inferSelect;

// Surplus food donations
export const surplusDonations = pgTable("surplus_donations", {
  id: serial("id").primaryKey(),
  ngoId: integer("ngo_id").notNull(),
  menuItemId: integer("menu_item_id").notNull(),
  quantity: integer("quantity").notNull(),
  donationDate: timestamp("donation_date").notNull().defaultNow(),
  status: text("status", { enum: ["scheduled", "in_progress", "completed"] }).notNull().default("scheduled"),
  notes: text("notes"),
});

export const insertSurplusDonationSchema = createInsertSchema(surplusDonations).pick({
  ngoId: true,
  menuItemId: true,
  quantity: true,
  notes: true,
});

export type InsertSurplusDonation = z.infer<typeof insertSurplusDonationSchema>;
export type SurplusDonation = typeof surplusDonations.$inferSelect;

// Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type", { enum: ["general", "surplus", "order", "reward"] }).notNull().default("general"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  relatedItemId: integer("related_item_id"),
  expiresAt: timestamp("expires_at"),
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  title: true,
  message: true,
  type: true,
  relatedItemId: true,
  expiresAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type SurplusMenuItemWithCategory = MenuItem & {
  category: Category;
  ngoPartners?: NgoPartner[];
};
