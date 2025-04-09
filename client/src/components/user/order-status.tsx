import { Badge } from "@/components/ui/badge";
import { type Order } from "@shared/schema";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";

type OrderStatusProps = {
  status: Order["status"];
  className?: string;
};

export function OrderStatus({ status, className }: OrderStatusProps) {
  const getStatusDetails = () => {
    switch (status) {
      case "placed":
        return {
          label: "Order Placed",
          variant: "primary" as const,
          icon: <Clock className="h-3.5 w-3.5 mr-1" />
        };
      case "preparing":
        return {
          label: "Preparing",
          variant: "warning" as const,
          icon: <Clock className="h-3.5 w-3.5 mr-1" />
        };
      case "ready":
        return {
          label: "Ready for Pickup",
          variant: "success" as const,
          icon: <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
        };
      case "completed":
        return {
          label: "Completed",
          variant: "success" as const,
          icon: <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
        };
      case "cancelled":
        return {
          label: "Cancelled",
          variant: "destructive" as const,
          icon: <AlertTriangle className="h-3.5 w-3.5 mr-1" />
        };
      default:
        return {
          label: status,
          variant: "outline" as const,
          icon: null
        };
    }
  };

  const { label, variant, icon } = getStatusDetails();

  return (
    <Badge variant={variant} className={className}>
      <span className="flex items-center">
        {icon}
        {label}
      </span>
    </Badge>
  );
}

export function OrderProgressBar({ status }: { status: Order["status"] }) {
  const getProgressPercentage = () => {
    switch (status) {
      case "placed":
        return 25;
      case "preparing":
        return 50;
      case "ready":
        return 75;
      case "completed":
        return 100;
      default:
        return 0;
    }
  };

  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium text-gray-900 mb-2">Order Progress</h4>
      <div className="relative">
        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
          <div 
            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary"
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
        <div className="flex text-xs justify-between">
          <div className="w-1/4 text-center">
            <div className={`${status !== "cancelled" ? "bg-primary" : "bg-gray-300"} text-white rounded-full w-6 h-6 flex items-center justify-center mx-auto mb-1`}>
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
            <span className={status !== "cancelled" ? "text-gray-900 font-medium" : "text-gray-400"}>Placed</span>
          </div>
          <div className="w-1/4 text-center">
            <div className={`${["preparing", "ready", "completed"].includes(status) ? "bg-primary" : "bg-gray-300"} text-white rounded-full w-6 h-6 flex items-center justify-center mx-auto mb-1`}>
              <Clock className="h-3.5 w-3.5" />
            </div>
            <span className={["preparing", "ready", "completed"].includes(status) ? "text-gray-900 font-medium" : "text-gray-400"}>Preparing</span>
          </div>
          <div className="w-1/4 text-center">
            <div className={`${["ready", "completed"].includes(status) ? "bg-primary" : "bg-gray-300"} text-white rounded-full w-6 h-6 flex items-center justify-center mx-auto mb-1`}>
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
            <span className={["ready", "completed"].includes(status) ? "text-gray-900 font-medium" : "text-gray-400"}>Ready</span>
          </div>
          <div className="w-1/4 text-center">
            <div className={`${status === "completed" ? "bg-primary" : "bg-gray-300"} text-white rounded-full w-6 h-6 flex items-center justify-center mx-auto mb-1`}>
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
            <span className={status === "completed" ? "text-gray-900 font-medium" : "text-gray-400"}>Delivered</span>
          </div>
        </div>
      </div>
    </div>
  );
}
