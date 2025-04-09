import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OrderWithItems } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Printer, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type OrderCardProps = {
  order: OrderWithItems;
};

export function OrderCard({ order }: OrderCardProps) {
  const { toast } = useToast();
  
  // Calculate time since order was placed
  const timeSince = formatDistanceToNow(new Date(order.createdAt), { addSuffix: true });
  
  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      await apiRequest("PATCH", `/api/orders/${order.id}/status`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Order status updated",
        description: `Order #${order.id} status has been updated.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update order status",
        description: error.message || "There was an error updating the order status.",
        variant: "destructive",
      });
    },
  });
  
  // Get next status based on current status
  const getNextStatus = () => {
    switch (order.status) {
      case "placed":
        return { label: "Start Preparing", value: "preparing" };
      case "preparing":
        return { label: "Mark as Ready", value: "ready" };
      case "ready":
        return { label: "Complete Order", value: "completed" };
      default:
        return null;
    }
  };
  
  const nextStatus = getNextStatus();
  
  // Handle status update
  const handleStatusUpdate = () => {
    if (nextStatus) {
      updateStatusMutation.mutate(nextStatus.value);
    }
  };
  
  // Get status badge class
  const getStatusBadgeClass = () => {
    switch (order.status) {
      case "placed":
        return "bg-primary/20 text-primary";
      case "preparing":
        return "bg-yellow-100 text-yellow-800";
      case "ready":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  return (
    <Card className={`overflow-hidden border-l-4 ${
      order.status === "placed" ? "border-primary" :
      order.status === "preparing" ? "border-yellow-400" :
      order.status === "ready" ? "border-green-500" :
      "border-gray-300"
    }`}>
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">#{order.id}</h3>
            <p className="text-sm text-gray-600">
              {order.user.name} • Placed {timeSince}
            </p>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass()}`}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </span>
        </div>
        
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Order Items</h4>
          <ul className="space-y-2">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between">
                <div className="flex items-start">
                  <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600 mr-2 mt-0.5">
                    {item.quantity}
                  </span>
                  <span className="text-gray-800">{item.menuItem.name}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
        
        {nextStatus && (
          <div className="mt-5 flex space-x-2">
            <Button 
              className="flex-1"
              onClick={handleStatusUpdate}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                nextStatus.label
              )}
            </Button>
            <Button variant="outline" size="icon">
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
