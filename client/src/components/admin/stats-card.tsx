import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

type StatsCardProps = {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor: string;
  trend?: {
    value: string;
    positive?: boolean;
  };
};

export function StatsCard({ title, value, icon: Icon, iconColor, trend }: StatsCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center">
          <div className={cn("p-3 rounded-full", `bg-${iconColor}/10`)}>
            <Icon className={cn("text-xl", `text-${iconColor}`)} />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <h3 className="text-2xl font-semibold text-gray-900">{value}</h3>
          </div>
        </div>
        {trend && (
          <div className={cn("mt-4 text-sm", trend.positive ? "text-green-600" : "text-red-600")}>
            {trend.positive ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
            <span className="ml-1">{trend.value}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
