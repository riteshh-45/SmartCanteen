import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { storage } from './storage';

// Map to store client connections by userId
const clients = new Map<number, WebSocket[]>();

interface OrderUpdatePayload {
  type: 'ORDER_UPDATE';
  order: {
    id: number;
    status: string;
    items: Array<{ name: string; quantity: number }>;
  };
}

interface NewOrderPayload {
  type: 'NEW_ORDER';
  order: {
    id: number;
    userId: number;
    customerName: string;
    totalAmount: number;
    items: Array<{ name: string; quantity: number }>;
  };
}

interface SurplusFoodPayload {
  type: 'SURPLUS_FOOD_ALERT';
  menuItem: {
    id: number;
    name: string;
    price: string | number;
    surplusPrice: string | number;
    image: string;
    surplusExpiryTime: Date;
  };
}

type WebSocketPayload = OrderUpdatePayload | NewOrderPayload | SurplusFoodPayload;

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');
    
    // Handle authentication and user identification
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle user authentication
        if (data.type === 'AUTH' && data.userId) {
          const userId = Number(data.userId);
          const userClients = clients.get(userId) || [];
          clients.set(userId, [...userClients, ws]);
          
          console.log(`User ${userId} authenticated on WebSocket`);
          
          // Set a property on the connection to identify it later
          (ws as any).userId = userId;
          
          // Send acknowledgment
          ws.send(JSON.stringify({ type: 'AUTH_SUCCESS' }));
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      const userId = (ws as any).userId;
      if (userId) {
        const userClients = clients.get(userId) || [];
        clients.set(userId, userClients.filter(client => client !== ws));
        if (userClients.length === 0) {
          clients.delete(userId);
        }
        console.log(`User ${userId} disconnected from WebSocket`);
      }
    });
  });

  return {
    // Send order update to specific user
    sendOrderUpdate: (userId: number, order: OrderUpdatePayload['order']) => {
      const userClients = clients.get(userId);
      if (userClients && userClients.length > 0) {
        const payload: OrderUpdatePayload = {
          type: 'ORDER_UPDATE',
          order
        };
        
        userClients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(payload));
          }
        });
      }
    },
    
    // Send new order notification to kitchen staff
    sendNewOrderToKitchen: async (orderId: number) => {
      const order = await storage.getOrderWithItems(orderId);
      if (!order) return;
      
      // Get all kitchen staff users
      const users = await Promise.all(
        Array.from(clients.keys()).map(id => storage.getUser(id))
      );
      
      const kitchenStaffIds = users
        .filter(user => user && user.role === 'kitchen')
        .map(user => user!.id);
        
      if (kitchenStaffIds.length === 0) return;
      
      const payload: NewOrderPayload = {
        type: 'NEW_ORDER',
        order: {
          id: order.id,
          userId: order.userId,
          customerName: order.user.name,
          totalAmount: order.totalAmount as unknown as number,
          items: order.items.map(item => ({
            name: item.menuItem.name,
            quantity: item.quantity
          }))
        }
      };
      
      kitchenStaffIds.forEach(id => {
        const staffClients = clients.get(id);
        if (staffClients) {
          staffClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(payload));
            }
          });
        }
      });
    },
    
    // Send surplus food alert to all connected users
    sendToAll: (payload: SurplusFoodPayload) => {
      // Iterate through all clients
      clients.forEach((userClients) => {
        userClients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(payload));
          }
        });
      });
    }
  };
}

export type WebSocketService = ReturnType<typeof setupWebSocket>;
