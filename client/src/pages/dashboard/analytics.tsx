import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useMenus } from "@/hooks/useMenus";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { AlertCircle } from "lucide-react";

const ALL_MENUS = "__all__";

export default function AnalyticsPage() {
  const { menus, menusLoading } = useMenus(true);
  const [selectedMenuId, setSelectedMenuId] = useState<string>(ALL_MENUS);
  const menuIdParam = selectedMenuId === ALL_MENUS ? undefined : selectedMenuId;
  const { analytics, analyticsLoading } = useAnalytics(menuIdParam, true);
  const [filterMode, setFilterMode] = useState<"all" | "never-made" | "least-ordered">("all");

  const filteredAnalytics = useMemo(() => {
    if (!analytics || analytics.length === 0) return [];
    
    if (filterMode === "never-made") {
      return analytics.filter(drink => drink.isNeverMade);
    }
    
    if (filterMode === "least-ordered") {
      const sorted = [...analytics].sort((a, b) => a.orderCount - b.orderCount);
      const bottomCount = Math.max(1, Math.ceil(sorted.length * 0.25));
      return sorted.slice(0, bottomCount);
    }
    
    return analytics;
  }, [analytics, filterMode]);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-full space-y-4">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Filter Options</CardTitle>
            <CardDescription>
              View drinks by popularity to find what needs attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={selectedMenuId}
                onValueChange={setSelectedMenuId}
                disabled={menusLoading}
              >
                <SelectTrigger className="w-[220px]" data-testid="select-analytics-menu">
                  <SelectValue placeholder="All menus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_MENUS}>All menus</SelectItem>
                  {menus.map((menu) => (
                    <SelectItem key={menu.id} value={menu.id}>
                      {menu.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant={filterMode === "all" ? "default" : "outline"}
                onClick={() => setFilterMode("all")}
                data-testid="button-filter-all"
              >
                All Drinks
              </Button>
              <Button
                variant={filterMode === "never-made" ? "default" : "outline"}
                onClick={() => setFilterMode("never-made")}
                data-testid="button-filter-never-made"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Never Made
              </Button>
              <Button
                variant={filterMode === "least-ordered" ? "default" : "outline"}
                onClick={() => setFilterMode("least-ordered")}
                data-testid="button-filter-least-ordered"
              >
                Least Ordered
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Drink Popularity</CardTitle>
            <CardDescription>
              {filterMode === "never-made" && "Drinks that haven't been made yet"}
              {filterMode === "least-ordered" && "Bottom 25% of ordered drinks"}
              {filterMode === "all" && "Total orders per drink"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <Skeleton className="h-96 w-full" />
            ) : filteredAnalytics.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={filteredAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={120}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Bar dataKey="orderCount" radius={[4, 4, 0, 0]}>
                    {filteredAnalytics.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`}
                        fill={entry.isNeverMade ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No drinks match this filter</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Detailed View</CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredAnalytics.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Drink Name</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead className="text-right">Order Count</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAnalytics
                      .sort((a, b) => {
                        if (filterMode === "least-ordered") return a.orderCount - b.orderCount;
                        return b.orderCount - a.orderCount;
                      })
                      .map((drink) => (
                        <TableRow 
                          key={drink.id}
                          data-testid={`row-analytics-${drink.id}`}
                        >
                          <TableCell className="font-serif font-medium">
                            {drink.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {drink.section}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {drink.orderCount}
                          </TableCell>
                          <TableCell className="text-right">
                            {drink.isNeverMade && (
                              <Badge variant="destructive">
                                Never Made
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No analytics data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
