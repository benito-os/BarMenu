import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { OrderWithDrink, DrinkAnalytics } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Clock, TrendingUp, AlertCircle, CheckCircle2, Home } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

export default function Dashboard() {
  const { toast } = useToast();
  const [filterMode, setFilterMode] = useState<"all" | "never-made" | "least-ordered">("all");

  // Fetch live queue
  const { data: queue, isLoading: queueLoading } = useQuery<OrderWithDrink[]>({
    queryKey: ["/api/orders/queue"],
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  // Fetch analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery<DrinkAnalytics[]>({
    queryKey: ["/api/analytics"],
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  // Mark as in progress mutation
  const inProgressMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return apiRequest("PATCH", `/api/orders/${orderId}`, { status: "in_progress" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/queue"] });
      toast({
        title: "Order Updated",
        description: "Drink is now being prepared",
      });
    },
  });

  // Mark as served mutation
  const serveMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return apiRequest("PATCH", `/api/orders/${orderId}`, { status: "served" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      toast({
        title: "Order Completed",
        description: "Drink marked as served",
      });
    },
  });

  // Filter analytics data
  const filteredAnalytics = (() => {
    if (!analytics || analytics.length === 0) return [];
    
    if (filterMode === "never-made") {
      return analytics.filter(drink => drink.isNeverMade);
    }
    
    if (filterMode === "least-ordered") {
      // Sort by order count ascending and take bottom 25% (minimum 1 drink)
      const sorted = [...analytics].sort((a, b) => a.orderCount - b.orderCount);
      const bottomCount = Math.max(1, Math.ceil(sorted.length * 0.25));
      return sorted.slice(0, bottomCount);
    }
    
    return analytics;
  })();

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "requested":
        return <Badge variant="default" className="bg-blue-500">Requested</Badge>;
      case "in_progress":
        return <Badge variant="default" className="bg-yellow-500">In Progress</Badge>;
      case "served":
        return <Badge variant="default" className="bg-green-500">Served</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-foreground">
              Host Dashboard
            </h1>
            <Link href="/">
              <Button 
                variant="outline" 
                size="sm"
                data-testid="button-back-home"
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="queue" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="queue" data-testid="tab-queue">
              <Clock className="w-4 h-4 mr-2" />
              Live Queue
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">
              <TrendingUp className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Queue Tab */}
          <TabsContent value="queue" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Pending Orders</CardTitle>
                <CardDescription>
                  Live view of drink requests - auto-refreshes every 5 seconds
                </CardDescription>
              </CardHeader>
              <CardContent>
                {queueLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : queue && queue.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Guest</TableHead>
                          <TableHead>Drink</TableHead>
                          <TableHead>Section</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {queue.map((order) => (
                          <TableRow 
                            key={order.id}
                            data-testid={`row-order-${order.id}`}
                          >
                            <TableCell className="font-medium">
                              {formatTime(order.requestedAt.toString())}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {order.guestName || "-"}
                            </TableCell>
                            <TableCell className="font-serif">
                              {order.drinkName}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {order.drinkSection}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(order.status)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                {order.status === "requested" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => inProgressMutation.mutate(order.id)}
                                    disabled={inProgressMutation.isPending}
                                    data-testid={`button-in-progress-${order.id}`}
                                  >
                                    <Clock className="w-4 h-4 mr-2" />
                                    Start Preparing
                                  </Button>
                                )}
                                {(order.status === "requested" || order.status === "in_progress") && (
                                  <Button
                                    size="sm"
                                    onClick={() => serveMutation.mutate(order.id)}
                                    disabled={serveMutation.isPending}
                                    data-testid={`button-serve-${order.id}`}
                                  >
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Mark Served
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-lg">No pending orders</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Orders will appear here when guests request drinks
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Filter Options</CardTitle>
                <CardDescription>
                  View drinks by popularity to find what needs attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
