import { Pool } from 'pg';
import { storage } from '../server/storage';
import { Decimal } from 'decimal.js';
import * as crypto from 'crypto';

/**
 * This script exports all data from in-memory storage to a PostgreSQL database
 * 
 * Usage:
 * 1. Create a PostgreSQL database
 * 2. Run the migration script first (migrate_to_postgres.sql)
 * 3. Set DATABASE_URL environment variable or update the connection config below
 * 4. Run this script with: npx tsx db/data_migration.ts
 */

// PostgreSQL connection configuration
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/smartcanteen';
const pool = new Pool({ connectionString });

// Helper to handle Decimal.js objects when inserting to PostgreSQL
function decimalToString(value: any): any {
  if (value instanceof Decimal) {
    return value.toString();
  }
  if (value && typeof value === 'object') {
    const result: any = Array.isArray(value) ? [] : {};
    for (const key in value) {
      result[key] = decimalToString(value[key]);
    }
    return result;
  }
  return value;
}

async function migrateData() {
  const client = await pool.connect();
  
  try {
    console.log('Starting data migration...');
    await client.query('BEGIN');
    
    // Migrate users
    const users = await storage.getUsers();
    console.log(`Migrating ${users.length} users...`);
    for (const user of users) {
      await client.query(
        'INSERT INTO users (id, username, password, name, email, role, loyalty_points) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [user.id, user.username, user.password, user.name, user.email, user.role, user.loyaltyPoints]
      );
    }
    
    // Migrate categories
    const categories = await storage.getCategories();
    console.log(`Migrating ${categories.length} categories...`);
    for (const category of categories) {
      await client.query(
        'INSERT INTO categories (id, name) VALUES ($1, $2)',
        [category.id, category.name]
      );
    }
    
    // Migrate menu items
    const menuItems = await storage.getMenuItems();
    console.log(`Migrating ${menuItems.length} menu items...`);
    for (const item of menuItems) {
      const nutritionalInfoStr = item.nutritionalInfo ? JSON.stringify(item.nutritionalInfo) : null;
      await client.query(
        `INSERT INTO menu_items (
          id, name, description, price, image, category_id, is_available, 
          rating, review_count, nutritional_info, allergens, is_surplus, 
          surplus_price, surplus_expiry_time, surplus_quantity
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          item.id, 
          item.name, 
          item.description, 
          decimalToString(item.price), 
          item.image, 
          item.categoryId, 
          item.isAvailable,
          decimalToString(item.rating), 
          item.reviewCount, 
          nutritionalInfoStr, 
          item.allergens, 
          item.isSurplus,
          item.surplusPrice ? decimalToString(item.surplusPrice) : null,
          item.surplusExpiryTime,
          item.surplusQuantity
        ]
      );
    }
    
    // Migrate orders
    const orders = await storage.getOrders();
    console.log(`Migrating ${orders.length} orders...`);
    for (const order of orders) {
      await client.query(
        `INSERT INTO orders (
          id, user_id, status, total_amount, created_at, 
          is_preorder, pickup_time, special_instructions
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          order.id,
          order.userId,
          order.status,
          decimalToString(order.totalAmount),
          order.createdAt,
          order.isPreorder,
          order.pickupTime,
          order.specialInstructions
        ]
      );
      
      // Migrate order items for this order
      const orderItems = await storage.getOrderItemsByOrderId(order.id);
      for (const item of orderItems) {
        await client.query(
          'INSERT INTO order_items (id, order_id, menu_item_id, quantity, price) VALUES ($1, $2, $3, $4, $5)',
          [item.id, item.orderId, item.menuItemId, item.quantity, decimalToString(item.price)]
        );
      }
    }
    
    // Migrate reviews
    for (const menuItem of menuItems) {
      const reviews = await storage.getReviewsByMenuItemId(menuItem.id);
      console.log(`Migrating ${reviews.length} reviews for menu item ${menuItem.id}...`);
      for (const review of reviews) {
        await client.query(
          'INSERT INTO reviews (id, user_id, menu_item_id, rating, comment, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
          [review.id, review.userId, review.menuItemId, review.rating, review.comment, review.createdAt]
        );
      }
    }
    
    // Migrate loyalty rewards
    const rewards = await storage.getLoyaltyRewards();
    console.log(`Migrating ${rewards.length} loyalty rewards...`);
    for (const reward of rewards) {
      await client.query(
        `INSERT INTO loyalty_rewards (
          id, name, description, points_required, reward_type, reward_value, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          reward.id,
          reward.name,
          reward.description,
          reward.pointsRequired,
          reward.rewardType,
          reward.rewardValue,
          reward.isActive
        ]
      );
    }
    
    // Migrate NGO partners
    const partners = await storage.getNgoPartners();
    console.log(`Migrating ${partners.length} NGO partners...`);
    for (const partner of partners) {
      await client.query(
        `INSERT INTO ngo_partners (
          id, name, description, contact_name, contact_email, contact_phone, address, is_active, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          partner.id,
          partner.name,
          partner.description,
          partner.contactName,
          partner.contactEmail,
          partner.contactPhone,
          partner.address,
          partner.isActive,
          partner.createdAt
        ]
      );
    }
    
    // Migrate redemptions
    for (const user of users) {
      const redemptions = await storage.getUserRedemptions(user.id);
      console.log(`Migrating ${redemptions.length} redemptions for user ${user.id}...`);
      for (const redemption of redemptions) {
        await client.query(
          `INSERT INTO reward_redemptions (
            id, user_id, reward_id, redeemed_at, points_used, status
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            redemption.id,
            redemption.userId,
            redemption.rewardId,
            redemption.redeemedAt,
            redemption.pointsUsed,
            redemption.status
          ]
        );
      }
    }
    
    // Migrate surplus donations
    // You'll need to implement a method to get all surplus donations first
    const ngoPartners = await storage.getNgoPartners();
    for (const partner of ngoPartners) {
      const donations = await storage.getSurplusDonationsByNgoId(partner.id);
      console.log(`Migrating ${donations.length} surplus donations for NGO ${partner.id}...`);
      for (const donation of donations) {
        await client.query(
          `INSERT INTO surplus_donations (
            id, ngo_id, menu_item_id, quantity, donation_date, status, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            donation.id,
            donation.ngoId,
            donation.menuItemId,
            donation.quantity,
            donation.donationDate,
            donation.status,
            donation.notes
          ]
        );
      }
    }
    
    // Migrate notifications
    for (const user of users) {
      const notifications = await storage.getUserNotifications(user.id);
      console.log(`Migrating ${notifications.length} notifications for user ${user.id}...`);
      for (const notification of notifications) {
        await client.query(
          `INSERT INTO notifications (
            id, user_id, title, message, type, is_read, created_at, related_item_id, expires_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            notification.id,
            notification.userId,
            notification.title,
            notification.message,
            notification.type,
            notification.isRead,
            notification.createdAt,
            notification.relatedItemId,
            notification.expiresAt
          ]
        );
      }
    }
    
    await client.query('COMMIT');
    console.log('Data migration completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during data migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Add a getUsers method to the storage interface 
async function updateStorageInterface() {
  if (typeof storage.getUsers !== 'function') {
    console.log('Adding getUsers method to storage interface...');
    // This is just a note - you'll need to add this to storage.ts
    console.log(`
    Before running this script, add the following methods to the IStorage interface in server/storage.ts:
    
    getUsers(): Promise<User[]>;
    
    And implement it in the MemStorage class:
    
    async getUsers(): Promise<User[]> {
      return Array.from(this.users.values());
    }
    `);
  }
}

// Run the migration
updateStorageInterface()
  .then(() => migrateData())
  .then(() => console.log('Migration complete!'))
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });