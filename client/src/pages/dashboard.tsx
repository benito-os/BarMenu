import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { OrderWithDrink, DrinkAnalytics, Menu, Drink, InsertMenu } from "@shared/schema";
import { insertMenuSchema } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Clock, TrendingUp, AlertCircle, CheckCircle2, Home, LogOut, Settings, QrCode, Download } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { QRCodeSVG } from "qrcode.react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function Dashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [filterMode, setFilterMode] = useState<"all" | "never-made" | "least-ordered">("all");
  const [selectedMenuId, setSelectedMenuId] = useState<string>("");
  const [selectedDrinks, setSelectedDrinks] = useState<Set<string>>(new Set());
  const [localDrinks, setLocalDrinks] = useState<Drink[]>([]);
  
  // Get base URL for QR codes
  const baseUrl = window.location.origin;
  
  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Check authentication
  const { data: authStatus, isLoading: authLoading } = useQuery<{ isAuthenticated: boolean }>({
    queryKey: ["/api/auth/check"],
  });

  // Fetch live queue (must be called before any conditional returns)
  const { data: queue, isLoading: queueLoading } = useQuery<OrderWithDrink[]>({
    queryKey: ["/api/orders/queue"],
    refetchInterval: 5000,
    enabled: !!authStatus?.isAuthenticated, // Only fetch if authenticated
  });

  // Fetch analytics (must be called before any conditional returns)
  const { data: analytics, isLoading: analyticsLoading } = useQuery<DrinkAnalytics[]>({
    queryKey: ["/api/analytics"],
    refetchInterval: 10000,
    enabled: !!authStatus?.isAuthenticated, // Only fetch if authenticated
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/dashboard/login");
      toast({
        title: "Logged Out",
        description: "You have been logged out successfully",
      });
    },
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

  // Fetch all menus
  const { data: menus, isLoading: menusLoading } = useQuery<Menu[]>({
    queryKey: ["/api/menus"],
    enabled: !!authStatus?.isAuthenticated,
  });

  // Create menu form
  const menuForm = useForm<InsertMenu>({
    resolver: zodResolver(insertMenuSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      isActive: false,
    },
  });

  // Create menu mutation
  const createMenuMutation = useMutation({
    mutationFn: async (menuData: InsertMenu) => {
      return apiRequest("POST", "/api/menus", menuData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menus"] });
      menuForm.reset();
      toast({
        title: "Menu Created",
        description: "New menu has been created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create menu",
        variant: "destructive",
      });
    },
  });

  const onMenuSubmit = (data: InsertMenu) => {
    createMenuMutation.mutate(data);
  };

  // Toggle menu active status mutation
  const toggleMenuMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/menus/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menus"] });
      toast({
        title: "Menu Updated",
        description: "Menu status has been updated",
      });
    },
  });

  // Create drink mutation
  const [newDrink, setNewDrink] = useState({
    menuId: "",
    name: "",
    section: "",
    description: "",
    recipe: "",
    style: "",
    baseSpirit: "",
    isMocktail: false,
    isStirred: false,
    isShaken: false,
    isActive: true,
    sortOrder: 0,
  });
  const createDrinkMutation = useMutation({
    mutationFn: async (drinkData: typeof newDrink) => {
      // Ensure sortOrder is a number
      const payload = {
        ...drinkData,
        sortOrder: Number(drinkData.sortOrder) || 0,
      };
      return apiRequest("POST", "/api/drinks", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drinks"] });
      setNewDrink({
        menuId: "",
        name: "",
        section: "",
        description: "",
        recipe: "",
        style: "",
        baseSpirit: "",
        isMocktail: false,
        isStirred: false,
        isShaken: false,
        isActive: true,
        sortOrder: 0,
      });
      toast({
        title: "Drink Created",
        description: "New drink has been added to the menu",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create drink",
        variant: "destructive",
      });
    },
  });

  // Redirect to login if not authenticated (after all hooks are called)
  useEffect(() => {
    if (!authLoading && !authStatus?.isAuthenticated) {
      setLocation("/dashboard/login");
    }
  }, [authStatus, authLoading, setLocation]);

  // Don't render dashboard if not authenticated
  if (authLoading || !authStatus?.isAuthenticated) {
    return null;
  }

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
            <div className="flex gap-2">
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
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="queue" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="queue" data-testid="tab-queue">
              <Clock className="w-4 h-4 mr-2" />
              Live Queue
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">
              <TrendingUp className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="admin" data-testid="tab-admin">
              <Settings className="w-4 h-4 mr-2" />
              Admin
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
                          <TableHead>Instructions</TableHead>
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
                            <TableCell className="text-sm max-w-xs truncate">
                              {order.drinkRecipe || "-"}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(order.status)}
                            </TableCell>
                            <TableCell className="text-right">
                              {order.status === "requested" && (
                                <Button
                                  size="sm"
                                  onClick={() => inProgressMutation.mutate(order.id)}
                                  disabled={inProgressMutation.isPending}
                                  data-testid={`button-in-progress-${order.id}`}
                                >
                                  <Clock className="w-4 h-4 mr-2" />
                                  Start Preparing
                                </Button>
                              )}
                              {order.status === "in_progress" && (
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

          {/* Admin Tab */}
          <TabsContent value="admin" className="space-y-6">
            {/* Create Menu Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Create New Menu</CardTitle>
                <CardDescription>
                  Add a new cocktail menu to your collection
                </CardDescription>
              </CardHeader>
              <CardContent>
                {menusLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : (
                <Form {...menuForm}>
                  <form onSubmit={menuForm.handleSubmit(onMenuSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={menuForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Menu Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="NYE 2025"
                                {...field}
                                disabled={createMenuMutation.isPending}
                                data-testid="input-menu-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={menuForm.control}
                        name="slug"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Slug (URL-friendly)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="nye-2025"
                                {...field}
                                disabled={createMenuMutation.isPending}
                                data-testid="input-menu-slug"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={menuForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="A curated selection of cocktails for..."
                              rows={3}
                              {...field}
                              value={field.value || ""}
                              disabled={createMenuMutation.isPending}
                              data-testid="input-menu-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      disabled={createMenuMutation.isPending}
                      data-testid="button-create-menu"
                    >
                      {createMenuMutation.isPending ? "Creating..." : "Create Menu"}
                    </Button>
                  </form>
                </Form>
                )}
              </CardContent>
            </Card>

            {/* Manage Menus Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Manage Menus</CardTitle>
                <CardDescription>
                  Toggle menu visibility for guests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {menusLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map(i => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : menus && menus.length > 0 ? (
                  <div className="space-y-4">
                    {menus.map((menu) => (
                      <div
                        key={menu.id}
                        className="flex items-center justify-between p-4 border rounded-md"
                        data-testid={`menu-item-${menu.id}`}
                      >
                        <div className="flex-1">
                          <h3 className="font-serif text-lg font-semibold">{menu.name}</h3>
                          <p className="text-sm text-muted-foreground">{menu.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">Slug: {menu.slug}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" data-testid={`button-qr-${menu.id}`}>
                                <QrCode className="w-4 h-4 mr-2" />
                                QR Code
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>{menu.name} - QR Code</DialogTitle>
                                <DialogDescription>
                                  Scan this code to view the menu on your phone
                                </DialogDescription>
                              </DialogHeader>
                              <div className="flex flex-col items-center gap-4 py-4">
                                <div className="bg-white p-4 rounded-lg">
                                  <QRCodeSVG
                                    value={`${baseUrl}/menu/${menu.slug}`}
                                    size={256}
                                    level="H"
                                    includeMargin={true}
                                  />
                                </div>
                                <p className="text-sm text-muted-foreground text-center">
                                  {`${baseUrl}/menu/${menu.slug}`}
                                </p>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`menu-active-${menu.id}`} className="text-sm">
                              {menu.isActive ? "Active" : "Inactive"}
                            </Label>
                            <Switch
                              id={`menu-active-${menu.id}`}
                              checked={menu.isActive}
                              onCheckedChange={(checked) => {
                                toggleMenuMutation.mutate({ id: menu.id, isActive: checked });
                              }}
                              disabled={toggleMenuMutation.isPending || menusLoading}
                              data-testid={`switch-menu-active-${menu.id}`}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No menus created yet. Create your first menu above!
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Home Page QR Code Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Home Page QR Code</CardTitle>
                <CardDescription>
                  QR code for the main landing page showing all active menus
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center gap-4">
                  <div className="bg-white p-4 rounded-lg border">
                    <QRCodeSVG
                      value={baseUrl}
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    {baseUrl}
                  </p>
                  <p className="text-xs text-muted-foreground text-center max-w-md">
                    This QR code links to your home page where guests can see all active menus
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Create Drink Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Create New Drink</CardTitle>
                <CardDescription>
                  Add a new drink to one of your menus
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newDrink.menuId && newDrink.name && newDrink.section) {
                      createDrinkMutation.mutate(newDrink);
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="drink-menu">Menu</Label>
                      <Select
                        value={newDrink.menuId}
                        onValueChange={(value) => setNewDrink({ ...newDrink, menuId: value })}
                        disabled={createDrinkMutation.isPending || menusLoading || !menus || menus.length === 0}
                      >
                        <SelectTrigger id="drink-menu" data-testid="select-drink-menu">
                          <SelectValue placeholder="Select a menu" />
                        </SelectTrigger>
                        <SelectContent>
                          {menus?.map((menu) => (
                            <SelectItem key={menu.id} value={menu.id}>
                              {menu.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="drink-name">Drink Name</Label>
                      <Input
                        id="drink-name"
                        value={newDrink.name}
                        onChange={(e) => setNewDrink({ ...newDrink, name: e.target.value })}
                        placeholder="Midnight Martini"
                        disabled={createDrinkMutation.isPending}
                        data-testid="input-drink-name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="drink-section">Section</Label>
                      <Input
                        id="drink-section"
                        value={newDrink.section}
                        onChange={(e) => setNewDrink({ ...newDrink, section: e.target.value })}
                        placeholder="Classics"
                        disabled={createDrinkMutation.isPending}
                        data-testid="input-drink-section"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="drink-style">Style</Label>
                      <Input
                        id="drink-style"
                        value={newDrink.style}
                        onChange={(e) => setNewDrink({ ...newDrink, style: e.target.value })}
                        placeholder="Dry, Boozy"
                        disabled={createDrinkMutation.isPending}
                        data-testid="input-drink-style"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="drink-description">Description</Label>
                    <Textarea
                      id="drink-description"
                      value={newDrink.description}
                      onChange={(e) => setNewDrink({ ...newDrink, description: e.target.value })}
                      placeholder="A classic martini with a twist..."
                      rows={2}
                      disabled={createDrinkMutation.isPending}
                      data-testid="input-drink-description"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="drink-recipe">Recipe / Instructions</Label>
                    <Textarea
                      id="drink-recipe"
                      value={newDrink.recipe}
                      onChange={(e) => setNewDrink({ ...newDrink, recipe: e.target.value })}
                      placeholder="2 oz gin, 0.5 oz dry vermouth, stir with ice..."
                      rows={3}
                      disabled={createDrinkMutation.isPending}
                      data-testid="input-drink-recipe"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="drink-base">Base Spirit</Label>
                    <Input
                      id="drink-base"
                      value={newDrink.baseSpirit}
                      onChange={(e) => setNewDrink({ ...newDrink, baseSpirit: e.target.value })}
                      placeholder="Gin"
                      disabled={createDrinkMutation.isPending}
                      data-testid="input-drink-base"
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="drink-mocktail"
                        checked={newDrink.isMocktail}
                        onCheckedChange={(checked) => setNewDrink({ ...newDrink, isMocktail: checked })}
                        disabled={createDrinkMutation.isPending}
                        data-testid="switch-drink-mocktail"
                      />
                      <Label htmlFor="drink-mocktail" className="text-sm">Mocktail</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="drink-stirred"
                        checked={newDrink.isStirred}
                        onCheckedChange={(checked) => setNewDrink({ ...newDrink, isStirred: checked })}
                        disabled={createDrinkMutation.isPending}
                        data-testid="switch-drink-stirred"
                      />
                      <Label htmlFor="drink-stirred" className="text-sm">Stirred</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="drink-shaken"
                        checked={newDrink.isShaken}
                        onCheckedChange={(checked) => setNewDrink({ ...newDrink, isShaken: checked })}
                        disabled={createDrinkMutation.isPending}
                        data-testid="switch-drink-shaken"
                      />
                      <Label htmlFor="drink-shaken" className="text-sm">Shaken</Label>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="drink-order" className="text-sm">Sort Order</Label>
                      <Input
                        id="drink-order"
                        type="number"
                        value={newDrink.sortOrder}
                        onChange={(e) => setNewDrink({ ...newDrink, sortOrder: parseInt(e.target.value) || 0 })}
                        disabled={createDrinkMutation.isPending}
                        data-testid="input-drink-order"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={createDrinkMutation.isPending || !newDrink.menuId || !newDrink.name.trim() || !newDrink.section.trim()}
                    data-testid="button-create-drink"
                  >
                    {createDrinkMutation.isPending ? "Creating..." : "Create Drink"}
                  </Button>
                  {!menus || menus.length === 0 ? (
                    <p className="text-sm text-muted-foreground mt-2">
                      Please create a menu first before adding drinks
                    </p>
                  ) : null}
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
