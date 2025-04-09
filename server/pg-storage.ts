import pkg from 'pg';
const { Pool } = pkg;
type PoolClient = pkg.PoolClient;
import { IStorage } from './storage';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import {
  User, InsertUser,
  Category, InsertCategory,
  MenuItem, InsertMenuItem, MenuItemWithCategory,
  Order, InsertOrder, OrderWithItems,
  OrderItem, InsertOrderItem,
  Review, InsertReview,
  LoyaltyReward, InsertLoyaltyReward,
  RewardRedemption, InsertRedemption,
  NgoPartner, InsertNgoPartner,
  SurplusDonation, InsertSurplusDonation,
  Notification, InsertNotification
} from '@shared/schema';
import { Decimal } from 'decimal.js';

// Create session store
const PgSession = pgSession(session);

export class PostgresStorage implements IStorage {
  private pool: typeof Pool.prototype;
  sessionStore: session.Store;

  constructor(connectionString: string) {
    // Create a connection pool
    this.pool = new Pool({ connectionString });

    // Create session store with the pool
    this.sessionStore = new PgSession({
      pool: this.pool,
      tableName: 'session',
      createTableIfMissing: true
    });

    // Test the connection
    this.pool.query('SELECT NOW()')
      .then(() => console.log('Connected to PostgreSQL'))
      .catch(err => console.error('Failed to connect to PostgreSQL:', err));
  }

  private async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  // Helper to convert PostgreSQL DECIMAL to string for the client
  private decimalToString(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'number') {
      return obj.toString();
    }

    if (obj instanceof Decimal) {
      return obj.toString();
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.decimalToString(item));
    }

    if (typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        result[key] = this.decimalToString(obj[key]);
      }
      return result;
    }

    return obj;
  }

  // -------------------- User Methods --------------------
  async getUsers(): Promise<User[]> {
    const client = await this.getClient();
    try {
      const result = await client.query('SELECT * FROM users ORDER BY id');
      return result.rows.map(row => ({
        id: row.id,
        username: row.username,
        password: row.password,
        name: row.name,
        email: row.email,
        role: row.role,
        loyaltyPoints: row.loyalty_points
      }));
    } finally {
      client.release();
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    const client = await this.getClient();
    try {
      const result = await client.query('SELECT * FROM users WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return undefined;
      }
      const row = result.rows[0];
      return {
        id: row.id,
        username: row.username,
        password: row.password,
        name: row.name,
        email: row.email,
        role: row.role,
        loyaltyPoints: row.loyalty_points
      };
    } finally {
      client.release();
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const client = await this.getClient();
    try {
      const result = await client.query('SELECT * FROM users WHERE username = $1', [username]);
      if (result.rows.length === 0) {
        return undefined;
      }
      const row = result.rows[0];
      return {
        id: row.id,
        username: row.username,
        password: row.password,
        name: row.name,
        email: row.email,
        role: row.role,
        loyaltyPoints: row.loyalty_points
      };
    } finally {
      client.release();
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        'INSERT INTO users (username, password, name, email, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [user.username, user.password, user.name, user.email, user.role]
      );
      const row = result.rows[0];
      return {
        id: row.id,
        username: row.username,
        password: row.password,
        name: row.name,
        email: row.email,
        role: row.role,
        loyaltyPoints: row.loyalty_points
      };
    } finally {
      client.release();
    }
  }

  // -------------------- Category Methods --------------------
  async getCategories(): Promise<Category[]> {
    const client = await this.getClient();
    try {
      const result = await client.query('SELECT * FROM categories ORDER BY id');
      return result.rows.map(row => ({
        id: row.id,
        name: row.name
      }));
    } finally {
      client.release();
    }
  }

  async getCategoryById(id: number): Promise<Category | undefined> {
    const client = await this.getClient();
    try {
      const result = await client.query('SELECT * FROM categories WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return undefined;
      }
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name
      };
    } finally {
      client.release();
    }
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        'INSERT INTO categories (name) VALUES ($1) RETURNING *',
        [category.name]
      );
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name
      };
    } finally {
      client.release();
    }
  }

  // -------------------- Menu Item Methods --------------------
  async getMenuItems(): Promise<MenuItem[]> {
    const client = await this.getClient();
    try {
      const result = await client.query('SELECT * FROM menu_items ORDER BY id');
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        price: this.decimalToString(row.price),
        image: row.image,
        categoryId: row.category_id,
        isAvailable: row.is_available,
        rating: this.decimalToString(row.rating),
        reviewCount: row.review_count,
        nutritionalInfo: row.nutritional_info,
        allergens: row.allergens,
        isSurplus: row.is_surplus,
        surplusPrice: row.surplus_price ? this.decimalToString(row.surplus_price) : null,
        surplusExpiryTime: row.surplus_expiry_time,
        surplusQuantity: row.surplus_quantity
      }));
    } finally {
      client.release();
    }
  }

  async getMenuItemsWithCategories(): Promise<MenuItemWithCategory[]> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `SELECT m.*, c.name as category_name 
         FROM menu_items m 
         JOIN categories c ON m.category_id = c.id 
         ORDER BY m.id`
      );
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        price: this.decimalToString(row.price),
        image: row.image,
        categoryId: row.category_id,
        isAvailable: row.is_available,
        rating: this.decimalToString(row.rating),
        reviewCount: row.review_count,
        nutritionalInfo: row.nutritional_info,
        allergens: row.allergens,
        isSurplus: row.is_surplus,
        surplusPrice: row.surplus_price ? this.decimalToString(row.surplus_price) : null,
        surplusExpiryTime: row.surplus_expiry_time,
        surplusQuantity: row.surplus_quantity,
        category: {
          id: row.category_id,
          name: row.category_name
        }
      }));
    } finally {
      client.release();
    }
  }

  async getMenuItemById(id: number): Promise<MenuItem | undefined> {
    const client = await this.getClient();
    try {
      const result = await client.query('SELECT * FROM menu_items WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return undefined;
      }
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        price: this.decimalToString(row.price),
        image: row.image,
        categoryId: row.category_id,
        isAvailable: row.is_available,
        rating: this.decimalToString(row.rating),
        reviewCount: row.review_count,
        nutritionalInfo: row.nutritional_info,
        allergens: row.allergens,
        isSurplus: row.is_surplus,
        surplusPrice: row.surplus_price ? this.decimalToString(row.surplus_price) : null,
        surplusExpiryTime: row.surplus_expiry_time,
        surplusQuantity: row.surplus_quantity
      };
    } finally {
      client.release();
    }
  }

  async createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem> {
    const client = await this.getClient();
    try {
      const nutritionalInfo = menuItem.nutritionalInfo ? JSON.stringify(menuItem.nutritionalInfo) : null;
      const result = await client.query(
        `INSERT INTO menu_items (
          name, description, price, image, category_id, is_available, 
          nutritional_info, allergens
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          menuItem.name,
          menuItem.description,
          menuItem.price,
          menuItem.image,
          menuItem.categoryId,
          menuItem.isAvailable,
          nutritionalInfo,
          menuItem.allergens
        ]
      );
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        price: this.decimalToString(row.price),
        image: row.image,
        categoryId: row.category_id,
        isAvailable: row.is_available,
        rating: this.decimalToString(row.rating),
        reviewCount: row.review_count,
        nutritionalInfo: row.nutritional_info,
        allergens: row.allergens,
        isSurplus: row.is_surplus,
        surplusPrice: row.surplus_price ? this.decimalToString(row.surplus_price) : null,
        surplusExpiryTime: row.surplus_expiry_time,
        surplusQuantity: row.surplus_quantity
      };
    } finally {
      client.release();
    }
  }

  async updateMenuItem(id: number, menuItem: Partial<InsertMenuItem>): Promise<MenuItem | undefined> {
    const client = await this.getClient();
    try {
      // Build the SET part of the query dynamically based on the provided fields
      const updates: string[] = [];
      const values: any[] = [];
      let paramCounter = 1;

      if (menuItem.name !== undefined) {
        updates.push(`name = $${paramCounter++}`);
        values.push(menuItem.name);
      }
      if (menuItem.description !== undefined) {
        updates.push(`description = $${paramCounter++}`);
        values.push(menuItem.description);
      }
      if (menuItem.price !== undefined) {
        updates.push(`price = $${paramCounter++}`);
        values.push(menuItem.price);
      }
      if (menuItem.image !== undefined) {
        updates.push(`image = $${paramCounter++}`);
        values.push(menuItem.image);
      }
      if (menuItem.categoryId !== undefined) {
        updates.push(`category_id = $${paramCounter++}`);
        values.push(menuItem.categoryId);
      }
      if (menuItem.isAvailable !== undefined) {
        updates.push(`is_available = $${paramCounter++}`);
        values.push(menuItem.isAvailable);
      }
      if (menuItem.nutritionalInfo !== undefined) {
        updates.push(`nutritional_info = $${paramCounter++}`);
        values.push(JSON.stringify(menuItem.nutritionalInfo));
      }
      if (menuItem.allergens !== undefined) {
        updates.push(`allergens = $${paramCounter++}`);
        values.push(menuItem.allergens);
      }

      if (updates.length === 0) {
        // No fields to update
        return await this.getMenuItemById(id);
      }

      // Add the ID as the last parameter
      values.push(id);

      const result = await client.query(
        `UPDATE menu_items SET ${updates.join(', ')} WHERE id = $${paramCounter} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return undefined;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        price: this.decimalToString(row.price),
        image: row.image,
        categoryId: row.category_id,
        isAvailable: row.is_available,
        rating: this.decimalToString(row.rating),
        reviewCount: row.review_count,
        nutritionalInfo: row.nutritional_info,
        allergens: row.allergens,
        isSurplus: row.is_surplus,
        surplusPrice: row.surplus_price ? this.decimalToString(row.surplus_price) : null,
        surplusExpiryTime: row.surplus_expiry_time,
        surplusQuantity: row.surplus_quantity
      };
    } finally {
      client.release();
    }
  }

  async deleteMenuItem(id: number): Promise<boolean> {
    const client = await this.getClient();
    try {
      const result = await client.query('DELETE FROM menu_items WHERE id = $1 RETURNING id', [id]);
      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }

  // -------------------- Order Methods --------------------
  async getOrders(): Promise<Order[]> {
    const client = await this.getClient();
    try {
      const result = await client.query('SELECT * FROM orders ORDER BY created_at DESC');
      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        status: row.status,
        totalAmount: this.decimalToString(row.total_amount),
        createdAt: row.created_at,
        isPreorder: row.is_preorder,
        pickupTime: row.pickup_time,
        specialInstructions: row.special_instructions
      }));
    } finally {
      client.release();
    }
  }

  async getOrderById(id: number): Promise<Order | undefined> {
    const client = await this.getClient();
    try {
      const result = await client.query('SELECT * FROM orders WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return undefined;
      }
      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        status: row.status,
        totalAmount: this.decimalToString(row.total_amount),
        createdAt: row.created_at,
        isPreorder: row.is_preorder,
        pickupTime: row.pickup_time,
        specialInstructions: row.special_instructions
      };
    } finally {
      client.release();
    }
  }

  async getOrdersByUserId(userId: number): Promise<Order[]> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        status: row.status,
        totalAmount: this.decimalToString(row.total_amount),
        createdAt: row.created_at,
        isPreorder: row.is_preorder,
        pickupTime: row.pickup_time,
        specialInstructions: row.special_instructions
      }));
    } finally {
      client.release();
    }
  }

  async getOrderWithItems(orderId: number): Promise<OrderWithItems | undefined> {
    const client = await this.getClient();
    try {
      // First get the order
      const orderResult = await client.query('SELECT * FROM orders WHERE id = $1', [orderId]);
      if (orderResult.rows.length === 0) {
        return undefined;
      }
      
      const orderRow = orderResult.rows[0];
      
      // Get the user
      const userResult = await client.query('SELECT * FROM users WHERE id = $1', [orderRow.user_id]);
      if (userResult.rows.length === 0) {
        return undefined;
      }
      
      const userRow = userResult.rows[0];
      
      // Get the order items with menu items
      const itemsResult = await client.query(
        `SELECT oi.*, mi.* 
         FROM order_items oi 
         JOIN menu_items mi ON oi.menu_item_id = mi.id 
         WHERE oi.order_id = $1`,
        [orderId]
      );
      
      const items = itemsResult.rows.map(row => ({
        id: row.id,
        orderId: row.order_id,
        menuItemId: row.menu_item_id,
        quantity: row.quantity,
        price: this.decimalToString(row.price),
        menuItem: {
          id: row.menu_item_id,
          name: row.name,
          description: row.description,
          price: this.decimalToString(row.price),
          image: row.image,
          categoryId: row.category_id,
          isAvailable: row.is_available,
          rating: this.decimalToString(row.rating),
          reviewCount: row.review_count,
          nutritionalInfo: row.nutritional_info,
          allergens: row.allergens,
          isSurplus: row.is_surplus,
          surplusPrice: row.surplus_price ? this.decimalToString(row.surplus_price) : null,
          surplusExpiryTime: row.surplus_expiry_time,
          surplusQuantity: row.surplus_quantity
        }
      }));
      
      return {
        id: orderRow.id,
        userId: orderRow.user_id,
        status: orderRow.status,
        totalAmount: this.decimalToString(orderRow.total_amount),
        createdAt: orderRow.created_at,
        isPreorder: orderRow.is_preorder,
        pickupTime: orderRow.pickup_time,
        specialInstructions: orderRow.special_instructions,
        items: items,
        user: {
          id: userRow.id,
          username: userRow.username,
          password: userRow.password,
          name: userRow.name,
          email: userRow.email,
          role: userRow.role,
          loyaltyPoints: userRow.loyalty_points
        }
      };
    } finally {
      client.release();
    }
  }

  async createOrder(order: InsertOrder, items: { menuItemId: number; quantity: number; price: number }[]): Promise<Order> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      
      // Insert the order
      const orderResult = await client.query(
        `INSERT INTO orders (
          user_id, status, total_amount, is_preorder, pickup_time, special_instructions
        ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          order.userId,
          order.status || 'placed',
          order.totalAmount,
          order.isPreorder || false,
          order.pickupTime,
          order.specialInstructions
        ]
      );
      
      const newOrder = orderResult.rows[0];
      const orderId = newOrder.id;
      
      // Insert order items
      for (const item of items) {
        await client.query(
          'INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES ($1, $2, $3, $4)',
          [orderId, item.menuItemId, item.quantity, item.price]
        );
      }
      
      await client.query('COMMIT');
      
      return {
        id: newOrder.id,
        userId: newOrder.user_id,
        status: newOrder.status,
        totalAmount: this.decimalToString(newOrder.total_amount),
        createdAt: newOrder.created_at,
        isPreorder: newOrder.is_preorder,
        pickupTime: newOrder.pickup_time,
        specialInstructions: newOrder.special_instructions
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateOrder(id: number, updates: { specialInstructions?: string, items: { menuItemId: number; quantity: number; price: number }[] }): Promise<Order | undefined> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      
      // First, check if the order exists and is in "placed" status
      const orderResult = await client.query(
        'SELECT * FROM orders WHERE id = $1',
        [id]
      );
      
      if (orderResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return undefined;
      }
      
      const order = orderResult.rows[0];
      if (order.status !== 'placed') {
        await client.query('ROLLBACK');
        throw new Error('Order can only be updated when in "placed" status');
      }
      
      // Update order special instructions if provided
      if (updates.specialInstructions !== undefined) {
        await client.query(
          'UPDATE orders SET special_instructions = $1 WHERE id = $2',
          [updates.specialInstructions, id]
        );
      }
      
      // Update order items
      if (updates.items && updates.items.length > 0) {
        // Delete existing order items
        await client.query('DELETE FROM order_items WHERE order_id = $1', [id]);
        
        // Insert new order items
        let totalAmount = 0;
        for (const item of updates.items) {
          await client.query(
            'INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES ($1, $2, $3, $4)',
            [id, item.menuItemId, item.quantity, item.price]
          );
          totalAmount += item.quantity * Number(item.price);
        }
        
        // Update the total amount of the order
        await client.query(
          'UPDATE orders SET total_amount = $1 WHERE id = $2',
          [totalAmount, id]
        );
      }
      
      await client.query('COMMIT');
      
      // Return the updated order
      const updatedOrderResult = await client.query('SELECT * FROM orders WHERE id = $1', [id]);
      const updatedOrder = updatedOrderResult.rows[0];
      
      return {
        id: updatedOrder.id,
        userId: updatedOrder.user_id,
        status: updatedOrder.status,
        totalAmount: this.decimalToString(updatedOrder.total_amount),
        createdAt: updatedOrder.created_at,
        isPreorder: updatedOrder.is_preorder,
        pickupTime: updatedOrder.pickup_time,
        specialInstructions: updatedOrder.special_instructions
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateOrderStatus(id: number, status: Order['status']): Promise<Order | undefined> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
        [status, id]
      );
      
      if (result.rows.length === 0) {
        return undefined;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        status: row.status,
        totalAmount: this.decimalToString(row.total_amount),
        createdAt: row.created_at,
        isPreorder: row.is_preorder,
        pickupTime: row.pickup_time,
        specialInstructions: row.special_instructions
      };
    } finally {
      client.release();
    }
  }

  async getOrderItemsByOrderId(orderId: number): Promise<OrderItem[]> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        'SELECT * FROM order_items WHERE order_id = $1',
        [orderId]
      );
      
      return result.rows.map(row => ({
        id: row.id,
        orderId: row.order_id,
        menuItemId: row.menu_item_id,
        quantity: row.quantity,
        price: this.decimalToString(row.price)
      }));
    } finally {
      client.release();
    }
  }

  // -------------------- Review Methods --------------------
  async getReviewsByMenuItemId(menuItemId: number): Promise<Review[]> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        'SELECT * FROM reviews WHERE menu_item_id = $1 ORDER BY created_at DESC',
        [menuItemId]
      );
      
      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        menuItemId: row.menu_item_id,
        rating: row.rating,
        comment: row.comment,
        createdAt: row.created_at
      }));
    } finally {
      client.release();
    }
  }

  async createReview(review: InsertReview): Promise<Review> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      
      // Insert the review
      const result = await client.query(
        'INSERT INTO reviews (user_id, menu_item_id, rating, comment) VALUES ($1, $2, $3, $4) RETURNING *',
        [review.userId, review.menuItemId, review.rating, review.comment]
      );
      
      // Update the menu item's rating
      await this.updateMenuItemRating(review.menuItemId);
      
      await client.query('COMMIT');
      
      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        menuItemId: row.menu_item_id,
        rating: row.rating,
        comment: row.comment,
        createdAt: row.created_at
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateMenuItemRating(menuItemId: number): Promise<void> {
    const client = await this.getClient();
    try {
      // Get all reviews for the menu item
      const reviewsResult = await client.query(
        'SELECT AVG(rating) as avg_rating, COUNT(*) as review_count FROM reviews WHERE menu_item_id = $1',
        [menuItemId]
      );
      
      if (reviewsResult.rows.length > 0) {
        const { avg_rating, review_count } = reviewsResult.rows[0];
        
        // Update the menu item with the new average rating and review count
        await client.query(
          'UPDATE menu_items SET rating = $1, review_count = $2 WHERE id = $3',
          [avg_rating || 0, review_count || 0, menuItemId]
        );
      }
    } finally {
      client.release();
    }
  }

  // -------------------- Loyalty Reward Methods --------------------
  async getLoyaltyRewards(): Promise<LoyaltyReward[]> {
    const client = await this.getClient();
    try {
      const result = await client.query('SELECT * FROM loyalty_rewards ORDER BY points_required');
      
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        pointsRequired: row.points_required,
        rewardType: row.reward_type,
        rewardValue: row.reward_value,
        isActive: row.is_active
      }));
    } finally {
      client.release();
    }
  }

  async getLoyaltyRewardById(id: number): Promise<LoyaltyReward | undefined> {
    const client = await this.getClient();
    try {
      const result = await client.query('SELECT * FROM loyalty_rewards WHERE id = $1', [id]);
      
      if (result.rows.length === 0) {
        return undefined;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        pointsRequired: row.points_required,
        rewardType: row.reward_type,
        rewardValue: row.reward_value,
        isActive: row.is_active
      };
    } finally {
      client.release();
    }
  }

  async createLoyaltyReward(reward: InsertLoyaltyReward): Promise<LoyaltyReward> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `INSERT INTO loyalty_rewards (
          name, description, points_required, reward_type, reward_value, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          reward.name,
          reward.description,
          reward.pointsRequired,
          reward.rewardType,
          reward.rewardValue,
          reward.isActive ?? true
        ]
      );
      
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        pointsRequired: row.points_required,
        rewardType: row.reward_type,
        rewardValue: row.reward_value,
        isActive: row.is_active
      };
    } finally {
      client.release();
    }
  }

  async updateLoyaltyReward(id: number, reward: Partial<InsertLoyaltyReward>): Promise<LoyaltyReward | undefined> {
    const client = await this.getClient();
    try {
      // Build the SET part of the query dynamically based on the provided fields
      const updates: string[] = [];
      const values: any[] = [];
      let paramCounter = 1;

      if (reward.name !== undefined) {
        updates.push(`name = $${paramCounter++}`);
        values.push(reward.name);
      }
      if (reward.description !== undefined) {
        updates.push(`description = $${paramCounter++}`);
        values.push(reward.description);
      }
      if (reward.pointsRequired !== undefined) {
        updates.push(`points_required = $${paramCounter++}`);
        values.push(reward.pointsRequired);
      }
      if (reward.rewardType !== undefined) {
        updates.push(`reward_type = $${paramCounter++}`);
        values.push(reward.rewardType);
      }
      if (reward.rewardValue !== undefined) {
        updates.push(`reward_value = $${paramCounter++}`);
        values.push(reward.rewardValue);
      }
      if (reward.isActive !== undefined) {
        updates.push(`is_active = $${paramCounter++}`);
        values.push(reward.isActive);
      }

      if (updates.length === 0) {
        // No fields to update
        return await this.getLoyaltyRewardById(id);
      }

      // Add the ID as the last parameter
      values.push(id);

      const result = await client.query(
        `UPDATE loyalty_rewards SET ${updates.join(', ')} WHERE id = $${paramCounter} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return undefined;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        pointsRequired: row.points_required,
        rewardType: row.reward_type,
        rewardValue: row.reward_value,
        isActive: row.is_active
      };
    } finally {
      client.release();
    }
  }

  // -------------------- User Loyalty Methods --------------------
  async getUserLoyaltyPoints(userId: number): Promise<number> {
    const client = await this.getClient();
    try {
      const result = await client.query('SELECT loyalty_points FROM users WHERE id = $1', [userId]);
      
      if (result.rows.length === 0) {
        return 0;
      }
      
      return result.rows[0].loyalty_points || 0;
    } finally {
      client.release();
    }
  }

  async addUserLoyaltyPoints(userId: number, points: number): Promise<number> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        'UPDATE users SET loyalty_points = loyalty_points + $1 WHERE id = $2 RETURNING loyalty_points',
        [points, userId]
      );
      
      if (result.rows.length === 0) {
        return 0;
      }
      
      return result.rows[0].loyalty_points;
    } finally {
      client.release();
    }
  }

  async redeemUserLoyaltyPoints(userId: number, points: number): Promise<boolean> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      
      // Check if user has enough points
      const userResult = await client.query('SELECT loyalty_points FROM users WHERE id = $1', [userId]);
      
      if (userResult.rows.length === 0 || userResult.rows[0].loyalty_points < points) {
        await client.query('ROLLBACK');
        return false;
      }
      
      // Subtract points from user
      await client.query(
        'UPDATE users SET loyalty_points = loyalty_points - $1 WHERE id = $2',
        [points, userId]
      );
      
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getUserRedemptions(userId: number): Promise<RewardRedemption[]> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        'SELECT * FROM reward_redemptions WHERE user_id = $1 ORDER BY redeemed_at DESC',
        [userId]
      );
      
      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        rewardId: row.reward_id,
        redeemedAt: row.redeemed_at,
        pointsUsed: row.points_used,
        status: row.status
      }));
    } finally {
      client.release();
    }
  }

  async createRedemption(redemption: InsertRedemption): Promise<RewardRedemption> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      
      // Check if user has enough points
      const userResult = await client.query('SELECT loyalty_points FROM users WHERE id = $1', [redemption.userId]);
      
      if (userResult.rows.length === 0 || userResult.rows[0].loyalty_points < redemption.pointsUsed) {
        await client.query('ROLLBACK');
        throw new Error('User does not have enough loyalty points');
      }
      
      // Subtract points from user
      await client.query(
        'UPDATE users SET loyalty_points = loyalty_points - $1 WHERE id = $2',
        [redemption.pointsUsed, redemption.userId]
      );
      
      // Create redemption record
      const result = await client.query(
        'INSERT INTO reward_redemptions (user_id, reward_id, points_used, status) VALUES ($1, $2, $3, $4) RETURNING *',
        [redemption.userId, redemption.rewardId, redemption.pointsUsed, redemption.status || 'pending']
      );
      
      await client.query('COMMIT');
      
      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        rewardId: row.reward_id,
        redeemedAt: row.redeemed_at,
        pointsUsed: row.points_used,
        status: row.status
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // -------------------- NGO Partner Methods --------------------
  async getNgoPartners(): Promise<NgoPartner[]> {
    const client = await this.getClient();
    try {
      const result = await client.query('SELECT * FROM ngo_partners ORDER BY id');
      
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        contactName: row.contact_name,
        contactEmail: row.contact_email,
        contactPhone: row.contact_phone,
        address: row.address,
        isActive: row.is_active,
        createdAt: row.created_at
      }));
    } finally {
      client.release();
    }
  }

  async getNgoPartnerById(id: number): Promise<NgoPartner | undefined> {
    const client = await this.getClient();
    try {
      const result = await client.query('SELECT * FROM ngo_partners WHERE id = $1', [id]);
      
      if (result.rows.length === 0) {
        return undefined;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        contactName: row.contact_name,
        contactEmail: row.contact_email,
        contactPhone: row.contact_phone,
        address: row.address,
        isActive: row.is_active,
        createdAt: row.created_at
      };
    } finally {
      client.release();
    }
  }

  async createNgoPartner(partner: InsertNgoPartner): Promise<NgoPartner> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `INSERT INTO ngo_partners (
          name, description, contact_name, contact_email, contact_phone, address, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          partner.name,
          partner.description,
          partner.contactName,
          partner.contactEmail,
          partner.contactPhone,
          partner.address,
          partner.isActive ?? true
        ]
      );
      
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        contactName: row.contact_name,
        contactEmail: row.contact_email,
        contactPhone: row.contact_phone,
        address: row.address,
        isActive: row.is_active,
        createdAt: row.created_at
      };
    } finally {
      client.release();
    }
  }

  async updateNgoPartner(id: number, partner: Partial<InsertNgoPartner>): Promise<NgoPartner | undefined> {
    const client = await this.getClient();
    try {
      // Build the SET part of the query dynamically based on the provided fields
      const updates: string[] = [];
      const values: any[] = [];
      let paramCounter = 1;

      if (partner.name !== undefined) {
        updates.push(`name = $${paramCounter++}`);
        values.push(partner.name);
      }
      if (partner.description !== undefined) {
        updates.push(`description = $${paramCounter++}`);
        values.push(partner.description);
      }
      if (partner.contactName !== undefined) {
        updates.push(`contact_name = $${paramCounter++}`);
        values.push(partner.contactName);
      }
      if (partner.contactEmail !== undefined) {
        updates.push(`contact_email = $${paramCounter++}`);
        values.push(partner.contactEmail);
      }
      if (partner.contactPhone !== undefined) {
        updates.push(`contact_phone = $${paramCounter++}`);
        values.push(partner.contactPhone);
      }
      if (partner.address !== undefined) {
        updates.push(`address = $${paramCounter++}`);
        values.push(partner.address);
      }
      if (partner.isActive !== undefined) {
        updates.push(`is_active = $${paramCounter++}`);
        values.push(partner.isActive);
      }

      if (updates.length === 0) {
        // No fields to update
        return await this.getNgoPartnerById(id);
      }

      // Add the ID as the last parameter
      values.push(id);

      const result = await client.query(
        `UPDATE ngo_partners SET ${updates.join(', ')} WHERE id = $${paramCounter} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return undefined;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        contactName: row.contact_name,
        contactEmail: row.contact_email,
        contactPhone: row.contact_phone,
        address: row.address,
        isActive: row.is_active,
        createdAt: row.created_at
      };
    } finally {
      client.release();
    }
  }

  // -------------------- Surplus Food Methods --------------------
  async markItemAsSurplus(menuItemId: number, surplusData: { 
    surplusPrice: number;
    surplusExpiryTime: Date;
    surplusQuantity: number;
  }): Promise<MenuItem | undefined> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `UPDATE menu_items SET 
          is_surplus = true,
          surplus_price = $1,
          surplus_expiry_time = $2,
          surplus_quantity = $3
        WHERE id = $4 RETURNING *`,
        [
          surplusData.surplusPrice,
          surplusData.surplusExpiryTime,
          surplusData.surplusQuantity,
          menuItemId
        ]
      );
      
      if (result.rows.length === 0) {
        return undefined;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        price: this.decimalToString(row.price),
        image: row.image,
        categoryId: row.category_id,
        isAvailable: row.is_available,
        rating: this.decimalToString(row.rating),
        reviewCount: row.review_count,
        nutritionalInfo: row.nutritional_info,
        allergens: row.allergens,
        isSurplus: row.is_surplus,
        surplusPrice: this.decimalToString(row.surplus_price),
        surplusExpiryTime: row.surplus_expiry_time,
        surplusQuantity: row.surplus_quantity
      };
    } finally {
      client.release();
    }
  }

  async getSurplusItems(): Promise<MenuItem[]> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `SELECT * FROM menu_items 
         WHERE is_surplus = true 
         AND surplus_expiry_time > NOW() 
         AND surplus_quantity > 0
         ORDER BY surplus_expiry_time ASC`
      );
      
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        price: this.decimalToString(row.price),
        image: row.image,
        categoryId: row.category_id,
        isAvailable: row.is_available,
        rating: this.decimalToString(row.rating),
        reviewCount: row.review_count,
        nutritionalInfo: row.nutritional_info,
        allergens: row.allergens,
        isSurplus: row.is_surplus,
        surplusPrice: this.decimalToString(row.surplus_price),
        surplusExpiryTime: row.surplus_expiry_time,
        surplusQuantity: row.surplus_quantity
      }));
    } finally {
      client.release();
    }
  }

  // -------------------- Surplus Donation Methods --------------------
  async createSurplusDonation(donation: InsertSurplusDonation): Promise<SurplusDonation> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      
      // Check if the menu item exists and has surplus
      const menuItemResult = await client.query(
        'SELECT * FROM menu_items WHERE id = $1 AND is_surplus = true AND surplus_quantity >= $2',
        [donation.menuItemId, donation.quantity]
      );
      
      if (menuItemResult.rows.length === 0) {
        await client.query('ROLLBACK');
        throw new Error('Menu item does not exist or does not have enough surplus quantity');
      }
      
      // Reduce the surplus quantity
      await client.query(
        'UPDATE menu_items SET surplus_quantity = surplus_quantity - $1 WHERE id = $2',
        [donation.quantity, donation.menuItemId]
      );
      
      // Create the donation record
      const result = await client.query(
        `INSERT INTO surplus_donations (
          ngo_id, menu_item_id, quantity, status, notes
        ) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [
          donation.ngoId,
          donation.menuItemId,
          donation.quantity,
          donation.status || 'scheduled',
          donation.notes
        ]
      );
      
      await client.query('COMMIT');
      
      const row = result.rows[0];
      return {
        id: row.id,
        ngoId: row.ngo_id,
        menuItemId: row.menu_item_id,
        quantity: row.quantity,
        donationDate: row.donation_date,
        status: row.status,
        notes: row.notes
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getSurplusDonationsByNgoId(ngoId: number): Promise<SurplusDonation[]> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        'SELECT * FROM surplus_donations WHERE ngo_id = $1 ORDER BY donation_date DESC',
        [ngoId]
      );
      
      return result.rows.map(row => ({
        id: row.id,
        ngoId: row.ngo_id,
        menuItemId: row.menu_item_id,
        quantity: row.quantity,
        donationDate: row.donation_date,
        status: row.status,
        notes: row.notes
      }));
    } finally {
      client.release();
    }
  }

  async updateSurplusDonationStatus(id: number, status: string): Promise<SurplusDonation | undefined> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        'UPDATE surplus_donations SET status = $1 WHERE id = $2 RETURNING *',
        [status, id]
      );
      
      if (result.rows.length === 0) {
        return undefined;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        ngoId: row.ngo_id,
        menuItemId: row.menu_item_id,
        quantity: row.quantity,
        donationDate: row.donation_date,
        status: row.status,
        notes: row.notes
      };
    } finally {
      client.release();
    }
  }

  // -------------------- Notification Methods --------------------
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `INSERT INTO notifications (
          user_id, title, message, type, related_item_id, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          notification.userId,
          notification.title,
          notification.message,
          notification.type || 'general',
          notification.relatedItemId,
          notification.expiresAt
        ]
      );
      
      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        message: row.message,
        type: row.type,
        isRead: row.is_read,
        createdAt: row.created_at,
        relatedItemId: row.related_item_id,
        expiresAt: row.expires_at
      };
    } finally {
      client.release();
    }
  }

  async getUserNotifications(userId: number): Promise<Notification[]> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `SELECT * FROM notifications 
         WHERE user_id = $1 
         AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY created_at DESC`,
        [userId]
      );
      
      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        title: row.title,
        message: row.message,
        type: row.type,
        isRead: row.is_read,
        createdAt: row.created_at,
        relatedItemId: row.related_item_id,
        expiresAt: row.expires_at
      }));
    } finally {
      client.release();
    }
  }

  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        'UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *',
        [id]
      );
      
      if (result.rows.length === 0) {
        return undefined;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        message: row.message,
        type: row.type,
        isRead: row.is_read,
        createdAt: row.created_at,
        relatedItemId: row.related_item_id,
        expiresAt: row.expires_at
      };
    } finally {
      client.release();
    }
  }

  async deleteExpiredNotifications(): Promise<void> {
    const client = await this.getClient();
    try {
      await client.query('DELETE FROM notifications WHERE expires_at < NOW()');
    } finally {
      client.release();
    }
  }
}