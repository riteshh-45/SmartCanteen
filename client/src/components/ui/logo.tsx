import { Utensils } from "lucide-react";
import { cn } from "@/lib/utils";

type LogoProps = React.ComponentProps<typeof Utensils>;

export function Logo({ className, ...props }: LogoProps) {
  return <Utensils className={cn("text-primary", className)} {...props} />;
}
