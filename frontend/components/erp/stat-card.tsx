import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
}

export function StatCard({ title, value, change, changeType = "neutral", icon: Icon, iconColor = "text-primary" }: StatCardProps) {
  return (
    <Card className="bg-card hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {change && (
              <p className={cn("text-xs font-medium", changeType === "positive" && "text-green-600", changeType === "negative" && "text-red-600", changeType === "neutral" && "text-muted-foreground")}>
                {change}
              </p>
            )}
          </div>
          <div className={cn("p-2 rounded-lg bg-secondary", iconColor)}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
