import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface DashboardCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  percentChange?: number;
}

export function DashboardCard({ title, value, icon: Icon, trend, percentChange }: DashboardCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {percentChange !== undefined && (
          <p className={`text-xs flex items-center gap-1 mt-1 ${percentChange >= 0 ? "text-green-600" : "text-red-600"}`}>
            {percentChange >= 0 ? "↑" : "↓"} {Math.abs(percentChange).toFixed(1)}% vs ontem
          </p>
        )}
        {trend && (
          <p className={`text-xs ${trend.isPositive ? "text-success" : "text-destructive"}`}>
            {trend.isPositive ? "+" : ""}{trend.value} desde o último mês
          </p>
        )}
      </CardContent>
    </Card>
  );
}
