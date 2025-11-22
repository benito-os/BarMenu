import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { OrderWithDrink, DrinkAnalytics, Menu, Drink, InsertMenu } from "@shared/validation";
import { menuCreateSchema } from "@shared/validation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Clock, TrendingUp, AlertCircle, CheckCircle2, Home, LogOut, Settings, QrCode, Download, X, Plus } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useFieldArray, useForm } from "react-hook-form";
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
import { GripVertical, Trash2, Pencil } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function Dashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [mainTab, setMainTab] = useState<string>("queue");
  const [activeSection, setActiveSection] = useState<string>("analytics");
  const [filterMode, setFilterMode] = useState<"all" | "never-made" | "least-ordered">("all");
  const [selectedMenuId, setSelectedMenuId] = useState<string>("");
  const [selectedDrinks, setSelectedDrinks] = useState<Set<string>>(new Set());
  const [localDrinks, setLocalDrinks] = useState<Drink[]>([]);
  const [editingDrink, setEditingDrink] = useState<Drink | null>(null);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [newSectionInput, setNewSectionInput] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDrink | null>(null);

  // Stable section keys - generated once when editing starts and persists
  const sectionKeysRef = useRef<Map<string, string>>(new Map());
  
  // Generate stable drag IDs for section reordering
  const sectionDragMapping = useMemo(() => {
    if (!editingMenu?.sections) {
      sectionKeysRef.current = new Map();
      return [];
    }
    
    // Generate or reuse stable keys for each section
    const mapping = editingMenu.sections.map((section, i) => {
      const lookupKey = `${editingMenu.id}-${i}-${section}`;
      if (!sectionKeysRef.current.has(lookupKey)) {
        sectionKeysRef.current.set(lookupKey, `section-${Math.random().toString(36).substr(2, 9)}`);
      }
      return {
        section,
        index: i,
        dragId: sectionKeysRef.current.get(lookupKey)!,
      };
    });
    
    return mapping;
  }, [editingMenu?.id, editingMenu?.sections]); // Update when menu or sections change
  const [qrSize, setQrSize] = useState<number>(200);
  const [qrFgColor, setQrFgColor] = useState<string>("#000000");
  const [qrBgColor, setQrBgColor] = useState<string>("#ffffff");
  const [qrLevel, setQrLevel] = useState<"L" | "M" | "Q" | "H">("H");
  const [qrIncludeMargin, setQrIncludeMargin] = useState<boolean>(true);
  
  // Get base URL for QR codes
  const baseUrl = window.location.origin;
  
  // Sensors for drag and drop (drinks)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Separate sensors for section reordering
  const sectionSensors = useSensors(
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
      setLocation("/dashboard-login");
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

  const defaultMenu = useMemo(() => {
    if (!menus || menus.length === 0) return null;
    return menus.find(menu => menu.isActive) ?? menus[0];
  }, [menus]);

  useEffect(() => {
    if (!selectedMenuId && !menusLoading && defaultMenu) {
      setSelectedMenuId(defaultMenu.id);
      setNewDrink(prev => ({
        ...prev,
        menuId: prev.menuId || defaultMenu.id,
        sortOrder: prev.menuId ? prev.sortOrder : getNextSortOrder(defaultMenu.id),
      }));
    }
  }, [defaultMenu, getNextSortOrder, menusLoading, selectedMenuId]);

  // Create menu form
  const menuForm = useForm<InsertMenu>({
    resolver: zodResolver(menuCreateSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      isActive: false,
      sections: ["Signature Cocktails", "Classics"],
      heroImageUrl: "",
      backgroundColor: "",
      accentColor: "",
      typography: "",
    },
  });

  const {
    fields: sectionFields,
    append: appendSection,
    remove: removeSection,
  } = useFieldArray({
    control: menuForm.control,
    name: "sections",
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
    const cleanedSections = (data.sections || [])
      .map(section => section.trim())
      .filter(Boolean);

    createMenuMutation.mutate({
      ...data,
      sections: cleanedSections,
    });
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

  // Update menu mutation
  const updateMenuMutation = useMutation({
    mutationFn: async (menu: Menu) => {
      // Only send allowed update fields
      const { id, name, slug, description, isActive, heroImageUrl, backgroundColor, accentColor, typography, sections } = menu;
      const updateData = { name, slug, description, isActive, heroImageUrl, backgroundColor, accentColor, typography, sections };
      return apiRequest("PATCH", `/api/menus/${id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menus"] });
      setEditingMenu(null);
      setNewSectionInput("");
      toast({
        title: "Menu Updated",
        description: "Menu has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update menu",
        variant: "destructive",
      });
    },
  });

  // Delete menu mutation
  const deleteMenuMutation = useMutation({
    mutationFn: async (menuId: string) => {
      return apiRequest("DELETE", `/api/menus/${menuId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menus"] });
      toast({
        title: "Menu Deleted",
        description: "Menu has been deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete menu",
        variant: "destructive",
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
    temperature: "",
    baseSpirit: "",
    isMocktail: false,
    canBeMocktail: false,
    isStirred: false,
    isShaken: false,
    isActive: true,
    sortOrder: 0,
  });

  const getNextSortOrder = useCallback((menuId: string) => {
    if (!menuId) return 0;
    const drinksForMenu = localDrinks?.filter(drink => drink.menuId === menuId) || [];
    const maxSortOrder = drinksForMenu.reduce((max, drink) => Math.max(max, drink.sortOrder || 0), 0);
    return maxSortOrder + 1;
  }, [localDrinks]);

  // Fetch all drinks for selected menu (including inactive) for admin management
  const { data: allDrinks, isLoading: allDrinksLoading } = useQuery<Drink[]>({
    queryKey: ["/api/drinks/all", selectedMenuId],
    queryFn: async () => {
      if (!selectedMenuId) return [];
      const response = await apiRequest("GET", `/api/drinks/all?menuId=${selectedMenuId}`);
      if (!response.ok) throw new Error("Failed to fetch drinks");
      return response.json();
    },
    enabled: !!authStatus?.isAuthenticated && !!selectedMenuId,
  });

  // Update localDrinks when allDrinks changes or when selectedMenuId changes
  useEffect(() => {
    if (allDrinks) {
      setLocalDrinks(allDrinks);
    } else if (selectedMenuId) {
      // Clear local drinks when menu changes but data hasn't loaded yet
      setLocalDrinks([]);
    }
  }, [allDrinks, selectedMenuId]);

  useEffect(() => {
    if (newDrink.menuId) {
      setNewDrink(prev => ({
        ...prev,
        sortOrder: getNextSortOrder(prev.menuId),
      }));
    }
  }, [getNextSortOrder, newDrink.menuId]);

  // Reorder drinks mutation
  const reorderDrinksMutation = useMutation({
    mutationFn: async (drinks: Array<{ id: string; sortOrder: number }>) => {
      console.log("Reorder mutation called with:", drinks);
      return await apiRequest("PATCH", "/api/drinks/reorder", { drinks });
    },
    onSuccess: () => {
      console.log("Reorder mutation success");
      queryClient.invalidateQueries({ queryKey: ["/api/drinks/all", selectedMenuId] });
      queryClient.invalidateQueries({ queryKey: ["/api/drinks", selectedMenuId] });
      toast({
        title: "Drinks reordered",
        description: "Drink order has been updated successfully",
      });
    },
    onError: (error) => {
      console.error("Reorder mutation error:", error);
      toast({
        title: "Error",
        description: `Failed to reorder drinks: ${error.message}`,
        variant: "destructive",
      });
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ["/api/drinks/all", selectedMenuId] });
    },
  });

  // Bulk delete drinks mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (drinkIds: string[]) => {
      return await apiRequest("DELETE", "/api/drinks/bulk", { drinkIds });
    },
    onSuccess: () => {
      setSelectedDrinks(new Set());
      queryClient.invalidateQueries({ queryKey: ["/api/drinks/all", selectedMenuId] });
      queryClient.invalidateQueries({ queryKey: ["/api/drinks", selectedMenuId] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      toast({
        title: "Drinks deleted",
        description: "Selected drinks have been deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete drinks",
        variant: "destructive",
      });
    },
  });

  // Bulk update drinks mutation (activate/deactivate)
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ drinkIds, isActive }: { drinkIds: string[]; isActive: boolean }) => {
      return await apiRequest("PATCH", "/api/drinks/bulk", { drinkIds, isActive });
    },
    onSuccess: () => {
      setSelectedDrinks(new Set());
      queryClient.invalidateQueries({ queryKey: ["/api/drinks/all", selectedMenuId] });
      queryClient.invalidateQueries({ queryKey: ["/api/drinks", selectedMenuId] });
      toast({
        title: "Drinks updated",
        description: "Selected drinks have been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update drinks",
        variant: "destructive",
      });
    },
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
    onSuccess: (_data, variables) => {
      const menuId = variables.menuId || selectedMenuId;

      if (menuId) {
        queryClient.invalidateQueries({ queryKey: ["/api/drinks/all", menuId] });
        queryClient.invalidateQueries({ queryKey: ["/api/drinks", menuId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/drinks"] });
        queryClient.invalidateQueries({ queryKey: ["/api/drinks/all"] });
      }

      const nextSortOrder = menuId ? getNextSortOrder(menuId) : 0;

      setNewDrink(prev => ({
        ...prev,
        menuId: menuId || prev.menuId,
        section: variables.section ?? prev.section,
        name: "",
        description: "",
        recipe: "",
        style: "",
        temperature: "",
        baseSpirit: "",
        isMocktail: false,
        canBeMocktail: false,
        isStirred: false,
        isShaken: false,
        isActive: true,
        sortOrder: nextSortOrder,
      }));
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

  // Update drink mutation
  const updateDrinkMutation = useMutation({
    mutationFn: async (drink: Drink) => {
      // Only send allowed update fields
      const { id, menuId, name, section, description, recipe, style, temperature, 
              isMocktail, canBeMocktail, isStirred, isShaken, baseSpirit, isActive, sortOrder } = drink;
      const updateData = { menuId, name, section, description, recipe, style, temperature, 
                          isMocktail, canBeMocktail, isStirred, isShaken, baseSpirit, isActive, sortOrder };
      return apiRequest("PATCH", `/api/drinks/${id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drinks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/drinks/all", selectedMenuId] });
      setEditingDrink(null);
      toast({
        title: "Drink Updated",
        description: "Drink has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update drink",
        variant: "destructive",
      });
    },
  });

  // Redirect to login if not authenticated (after all hooks are called)
  useEffect(() => {
    if (!authLoading && !authStatus?.isAuthenticated) {
      setLocation("/dashboard-login");
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

  // Handle drag end for reordering drinks
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      return; // No change in position
    }
    
    const oldIndex = localDrinks.findIndex(d => d.id === active.id);
    const newIndex = localDrinks.findIndex(d => d.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) {
      console.error("Could not find drink indices for reorder");
      return;
    }
    
    const reordered = arrayMove(localDrinks, oldIndex, newIndex);
    
    // Update sort order based on new positions
    const updates = reordered.map((drink, index) => ({
      id: drink.id,
      sortOrder: index,
    }));
    
    // Optimistically update UI
    setLocalDrinks(reordered);
    
    // Call mutation to persist to backend
    reorderDrinksMutation.mutate(updates);
  };

  // Toggle drink selection
  const toggleDrinkSelection = (drinkId: string) => {
    const newSelection = new Set(selectedDrinks);
    if (newSelection.has(drinkId)) {
      newSelection.delete(drinkId);
    } else {
      newSelection.add(drinkId);
    }
    setSelectedDrinks(newSelection);
  };

  // Select all or deselect all
  const toggleSelectAll = () => {
    if (selectedDrinks.size === localDrinks.length) {
      setSelectedDrinks(new Set());
    } else {
      setSelectedDrinks(new Set(localDrinks.map(d => d.id)));
    }
  };

  // Sortable Drink Item Component (Card Grid View)
  function SortableDrinkItem({ drink }: { drink: Drink }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: drink.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <Card
        ref={setNodeRef}
        style={style}
        className="hover-elevate cursor-pointer"
        onClick={() => toggleDrinkSelection(drink.id)}
        data-testid={`drink-item-${drink.id}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="font-serif text-lg line-clamp-1">{drink.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {drink.section && (
                  <Badge variant="secondary" className="text-xs">{drink.section}</Badge>
                )}
                {!drink.isActive && (
                  <Badge variant="outline" className="text-xs">Inactive</Badge>
                )}
              </div>
            </div>
            <Checkbox
              checked={selectedDrinks.has(drink.id)}
              onCheckedChange={() => {
                toggleDrinkSelection(drink.id);
              }}
              onClick={(e) => e.stopPropagation()}
              data-testid={`checkbox-drink-${drink.id}`}
            />
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          {drink.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {drink.description}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {drink.style && (
              <Badge variant="outline" className="text-xs">{drink.style}</Badge>
            )}
            {drink.baseSpirit && (
              <Badge variant="outline" className="text-xs">{drink.baseSpirit}</Badge>
            )}
            {drink.temperature && (
              <Badge variant="outline" className="text-xs capitalize">{drink.temperature.replace('_', ' ')}</Badge>
            )}
          </div>
        </CardContent>
        <CardFooter className="pt-3 border-t justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 hover-elevate rounded"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">Order: {drink.sortOrder}</span>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setEditingDrink(drink);
              }}
              data-testid={`button-edit-drink-${drink.id}`}
            >
              <Pencil className="w-3 h-3 mr-1" />
              Edit
            </Button>
          </div>
        </CardFooter>
      </Card>
    );
  }

  const style = {
    "--sidebar-width": "16rem",
  } as React.CSSProperties;

  return (
    <Tabs defaultValue="queue" value={mainTab} onValueChange={setMainTab} className="h-screen flex flex-col">
      <TabsList className="w-full rounded-none border-b" data-testid="main-tabs">
        <TabsTrigger value="queue" data-testid="tab-queue">Live Queue</TabsTrigger>
        <TabsTrigger value="management" data-testid="tab-management">Management</TabsTrigger>
      </TabsList>
      
      {/* Live Queue Tab - Full Width, No Sidebar */}
      <TabsContent value="queue" className="flex-1 overflow-hidden m-0">
        <div className="flex flex-col h-full">
          <header className="flex items-center justify-between p-4 border-b">
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-foreground">
              Bar Flores Dashboard
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
          </header>

          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Queue Section Content */}
              {(
                <>
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
                                  className="cursor-pointer hover-elevate"
                                  onClick={() => setSelectedOrder(order)}
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
                                  <TableCell className="text-sm">
                                    {order.drinkRecipe || "-"}
                                  </TableCell>
                                  <TableCell>
                                    {getStatusBadge(order.status)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {order.status === "requested" && (
                                      <Button
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          inProgressMutation.mutate(order.id);
                                        }}
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
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          serveMutation.mutate(order.id);
                                        }}
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

                  {/* Order Detail Drawer */}
                  <Sheet open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
                    <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                      {selectedOrder && (
                        <>
                          <SheetHeader>
                            <SheetTitle className="font-serif text-2xl">{selectedOrder.drinkName}</SheetTitle>
                            <SheetDescription>
                              Ordered {formatTime(selectedOrder.requestedAt.toString())}
                              {selectedOrder.guestName && ` by ${selectedOrder.guestName}`}
                            </SheetDescription>
                          </SheetHeader>

                          <div className="mt-6 space-y-6">
                            {/* Status */}
                            <div>
                              <h3 className="font-semibold mb-2">Status</h3>
                              {getStatusBadge(selectedOrder.status)}
                            </div>

                            {/* Guest Name */}
                            {selectedOrder.guestName && (
                              <div>
                                <h3 className="font-semibold mb-2">Guest Name</h3>
                                <p className="text-muted-foreground">{selectedOrder.guestName}</p>
                              </div>
                            )}

                            {/* Recipe/Instructions */}
                            {selectedOrder.drinkRecipe && (
                              <div>
                                <h3 className="font-semibold mb-2">Recipe & Instructions</h3>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedOrder.drinkRecipe}</p>
                              </div>
                            )}

                            {/* Description */}
                            {selectedOrder.drinkDescription && (
                              <div>
                                <h3 className="font-semibold mb-2">Description</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{selectedOrder.drinkDescription}</p>
                              </div>
                            )}

                            {/* Drink Details */}
                            <div>
                              <h3 className="font-semibold mb-3">Drink Details</h3>
                              <div className="space-y-2 text-sm">
                                {selectedOrder.drinkStyle && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Style:</span>
                                    <span className="font-medium">{selectedOrder.drinkStyle}</span>
                                  </div>
                                )}
                                {selectedOrder.drinkBaseSpirit && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Base Spirit:</span>
                                    <span className="font-medium">{selectedOrder.drinkBaseSpirit}</span>
                                  </div>
                                )}
                                {selectedOrder.drinkTemperature && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Temperature:</span>
                                    <span className="font-medium">{selectedOrder.drinkTemperature}</span>
                                  </div>
                                )}
                                {selectedOrder.drinkSection && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Section:</span>
                                    <span className="font-medium">{selectedOrder.drinkSection}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Characteristics */}
                            {(selectedOrder.drinkIsMocktail || selectedOrder.drinkCanBeMocktail || selectedOrder.drinkIsStirred || selectedOrder.drinkIsShaken) && (
                              <div>
                                <h3 className="font-semibold mb-3">Characteristics</h3>
                                <div className="flex flex-wrap gap-2">
                                  {selectedOrder.drinkIsMocktail && (
                                    <Badge variant="secondary">Mocktail</Badge>
                                  )}
                                  {selectedOrder.drinkCanBeMocktail && !selectedOrder.drinkIsMocktail && (
                                    <Badge variant="outline">Can be Mocktail</Badge>
                                  )}
                                  {selectedOrder.drinkIsStirred && (
                                    <Badge variant="outline">Stirred</Badge>
                                  )}
                                  {selectedOrder.drinkIsShaken && (
                                    <Badge variant="outline">Shaken</Badge>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="pt-4 border-t space-y-3">
                              {selectedOrder.status === "requested" && (
                                <Button
                                  className="w-full"
                                  onClick={() => {
                                    inProgressMutation.mutate(selectedOrder.id);
                                    setSelectedOrder(null);
                                  }}
                                  disabled={inProgressMutation.isPending}
                                  data-testid="sheet-button-start-preparing"
                                >
                                  <Clock className="w-4 h-4 mr-2" />
                                  Start Preparing
                                </Button>
                              )}
                              {selectedOrder.status === "in_progress" && (
                                <Button
                                  className="w-full"
                                  onClick={() => {
                                    serveMutation.mutate(selectedOrder.id);
                                    setSelectedOrder(null);
                                  }}
                                  disabled={serveMutation.isPending}
                                  data-testid="sheet-button-mark-served"
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                  Mark as Served
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => setSelectedOrder(null)}
                                data-testid="sheet-button-close"
                              >
                                Close
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </SheetContent>
                  </Sheet>
                </>
              )}
            </div>
          </main>
        </div>
      </TabsContent>
      
      {/* Management Tab - With Sidebar */}
      <TabsContent value="management" className="flex-1 h-full overflow-hidden m-0">
        <SidebarProvider style={style}>
            <div className="flex flex-1 w-full min-h-0">
              <AppSidebar
                activeSection={activeSection}
                onSectionChange={setActiveSection}
                onLogout={() => logoutMutation.mutate()}
              />
              <div className="flex flex-col flex-1 min-h-0">
                <header className="flex-shrink-0 flex items-center justify-between p-4 border-b">
                  <div className="flex items-center gap-4">
                    <SidebarTrigger data-testid="button-sidebar-toggle" />
                    <h1 className="font-serif text-2xl md:text-3xl font-bold text-foreground">
                      Bar Flores Dashboard
                    </h1>
                  </div>
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
                </header>

                <main className="flex-1 overflow-y-auto p-6 min-h-0">
                <div className="max-w-7xl mx-auto space-y-6">
                  {/* Analytics Section */}
                  {activeSection === "analytics" && (
                <>
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
                </>
              )}

              {/* Menus Section */}
              {activeSection === "menus" && (
                <>
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      <FormField
                        control={menuForm.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex flex-col justify-end space-y-2">
                            <div className="flex items-start justify-between gap-3 rounded-md border p-3">
                              <div>
                                <FormLabel>Active Menu</FormLabel>
                                <FormDescription>
                                  Immediately make this menu visible to guests
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={createMenuMutation.isPending}
                                  data-testid="switch-menu-active"
                                />
                              </FormControl>
                            </div>
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
                    <div className="border rounded-md p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold">Sections</h3>
                          <p className="text-xs text-muted-foreground">Organize drinks into groups before adding them</p>
                        </div>
                        <Button
                          type="button"
                          onClick={() => appendSection("")}
                          variant="secondary"
                          size="sm"
                          disabled={createMenuMutation.isPending}
                          data-testid="button-add-section"
                        >
                          <Plus className="h-4 w-4 mr-1" /> Add section
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {sectionFields.map((sectionField, index) => (
                          <FormField
                            key={sectionField.id}
                            control={menuForm.control}
                            name={`sections.${index}`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="sr-only">Section {index + 1}</FormLabel>
                                <div className="flex gap-2">
                                  <FormControl>
                                    <Input
                                      placeholder={`e.g. Section ${index + 1}`}
                                      {...field}
                                      disabled={createMenuMutation.isPending}
                                      data-testid={`input-menu-section-${index}`}
                                    />
                                  </FormControl>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => removeSection(index)}
                                    disabled={createMenuMutation.isPending || sectionFields.length === 1}
                                    data-testid={`button-remove-section-${index}`}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <h3 className="text-sm font-semibold mb-4">Theme Customization (Optional)</h3>
                      <div className="space-y-4">
                        <FormField
                          control={menuForm.control}
                          name="heroImageUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Hero Image URL</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="https://example.com/image.jpg"
                                  {...field}
                                  value={field.value || ""}
                                  disabled={createMenuMutation.isPending}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={menuForm.control}
                            name="backgroundColor"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Background Color</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="#ffffff or hsl(0, 0%, 100%)"
                                    {...field}
                                    value={field.value || ""}
                                    disabled={createMenuMutation.isPending}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={menuForm.control}
                            name="accentColor"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Accent Color</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="#000000 or hsl(0, 0%, 0%)"
                                    {...field}
                                    value={field.value || ""}
                                    disabled={createMenuMutation.isPending}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={menuForm.control}
                          name="typography"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Typography Style</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Playfair Display, serif"
                                  {...field}
                                  value={field.value || ""}
                                  disabled={createMenuMutation.isPending}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
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
                          {menu.sections && menu.sections.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              <span className="text-xs text-muted-foreground">Sections:</span>
                              {menu.sections.map((section, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {section}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingMenu(menu)}
                            data-testid={`button-edit-menu-${menu.id}`}
                          >
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                data-testid={`button-delete-menu-${menu.id}`}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Menu</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{menu.name}"? This action will also delete all associated drinks and cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMenuMutation.mutate(menu.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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

            {/* Edit Menu Dialog */}
            <Dialog open={!!editingMenu} onOpenChange={(open) => !open && setEditingMenu(null)}>
              <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Edit Menu</DialogTitle>
                  <DialogDescription>
                    Update menu information and theming
                  </DialogDescription>
                </DialogHeader>
                {editingMenu && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      updateMenuMutation.mutate(editingMenu);
                    }}
                    className="flex flex-col flex-1 min-h-0"
                  >
                    <ScrollArea className="flex-1 pr-4">
                      <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-menu-name">Menu Name</Label>
                        <Input
                          id="edit-menu-name"
                          value={editingMenu.name}
                          onChange={(e) => setEditingMenu({ ...editingMenu, name: e.target.value })}
                          placeholder="NYE 2025"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-menu-slug">Slug (URL-friendly)</Label>
                        <Input
                          id="edit-menu-slug"
                          value={editingMenu.slug}
                          onChange={(e) => setEditingMenu({ ...editingMenu, slug: e.target.value })}
                          placeholder="nye-2025"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-menu-description">Description</Label>
                      <Textarea
                        id="edit-menu-description"
                        value={editingMenu.description || ""}
                        onChange={(e) => setEditingMenu({ ...editingMenu, description: e.target.value })}
                        placeholder="A curated selection of cocktails for..."
                        rows={3}
                      />
                    </div>

                    <div className="border-t pt-4">
                      <h3 className="text-sm font-semibold mb-4">Theme Customization (Optional)</h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-menu-hero">Hero Image URL</Label>
                          <Input
                            id="edit-menu-hero"
                            value={editingMenu.heroImageUrl || ""}
                            onChange={(e) => setEditingMenu({ ...editingMenu, heroImageUrl: e.target.value })}
                            placeholder="https://example.com/image.jpg"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="edit-menu-bg-color">Background Color</Label>
                            <Input
                              id="edit-menu-bg-color"
                              value={editingMenu.backgroundColor || ""}
                              onChange={(e) => setEditingMenu({ ...editingMenu, backgroundColor: e.target.value })}
                              placeholder="#ffffff or hsl(0, 0%, 100%)"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-menu-accent-color">Accent Color</Label>
                            <Input
                              id="edit-menu-accent-color"
                              value={editingMenu.accentColor || ""}
                              onChange={(e) => setEditingMenu({ ...editingMenu, accentColor: e.target.value })}
                              placeholder="#000000 or hsl(0, 0%, 0%)"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-menu-typography">Typography Style</Label>
                          <Select
                            value={editingMenu.typography || "not_specified"}
                            onValueChange={(value) => setEditingMenu({ ...editingMenu, typography: value === "not_specified" ? "" : value })}
                          >
                            <SelectTrigger id="edit-menu-typography" data-testid="select-edit-menu-typography">
                              <SelectValue placeholder="Select typography" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="not_specified">Not Specified (Default)</SelectItem>
                              <SelectItem value="Playfair Display, serif">Playfair Display (Serif)</SelectItem>
                              <SelectItem value="Inter, sans-serif">Inter (Sans-serif)</SelectItem>
                              <SelectItem value="Roboto, sans-serif">Roboto (Sans-serif)</SelectItem>
                              <SelectItem value="Open Sans, sans-serif">Open Sans (Sans-serif)</SelectItem>
                              <SelectItem value="Lora, serif">Lora (Serif)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Section Management */}
                        <div className="space-y-2">
                          <Label>Menu Sections</Label>
                          <p className="text-xs text-muted-foreground">
                            Define and reorder sections to organize drinks (drag to reorder)
                          </p>
                          {editingMenu.sections && editingMenu.sections.length > 0 && sectionDragMapping.length > 0 && (
                            <DndContext
                              sensors={sectionSensors}
                              collisionDetection={closestCenter}
                              onDragEnd={(event) => {
                                const { active, over } = event;
                                if (over && active.id !== over.id) {
                                  const oldMapping = sectionDragMapping.find(m => m.dragId === active.id);
                                  const newMapping = sectionDragMapping.find(m => m.dragId === over.id);
                                  if (oldMapping && newMapping && oldMapping.index !== newMapping.index) {
                                    const reordered = [...editingMenu.sections];
                                    const [moved] = reordered.splice(oldMapping.index, 1);
                                    reordered.splice(newMapping.index, 0, moved);
                                    setEditingMenu({ ...editingMenu, sections: reordered });
                                  }
                                }
                              }}
                            >
                              <SortableContext
                                items={sectionDragMapping.map(m => m.dragId)}
                                strategy={verticalListSortingStrategy}
                              >
                                <div className="space-y-2 p-3 border rounded-md bg-muted/20">
                                  {sectionDragMapping.map((mapping) => {
                                    const {
                                      attributes,
                                      listeners,
                                      setNodeRef,
                                      transform,
                                      transition,
                                      isDragging,
                                    } = useSortable({ id: mapping.dragId });

                                    const style = {
                                      transform: CSS.Transform.toString(transform),
                                      transition,
                                      opacity: isDragging ? 0.5 : 1,
                                    };

                                    return (
                                      <div
                                        key={mapping.dragId}
                                        ref={setNodeRef}
                                        style={style}
                                        className="flex items-center gap-2 p-2 bg-background border rounded hover-elevate"
                                        data-testid={`section-item-${mapping.index}`}
                                      >
                                        <div
                                          {...attributes}
                                          {...listeners}
                                          className="cursor-grab active:cursor-grabbing p-1"
                                        >
                                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                                        </div>
                                        <Badge variant="secondary" className="flex-1" data-testid={`badge-section-${mapping.index}`}>
                                          {mapping.section}
                                        </Badge>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newSections = editingMenu.sections.filter((_, i) => i !== mapping.index);
                                            setEditingMenu({ ...editingMenu, sections: newSections });
                                          }}
                                          className="p-1 hover:bg-destructive/20 rounded-full"
                                          data-testid={`button-remove-section-${mapping.index}`}
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </SortableContext>
                            </DndContext>
                          )}
                          <div className="flex gap-2">
                            <Input
                              value={newSectionInput}
                              onChange={(e) => setNewSectionInput(e.target.value)}
                              placeholder="Add new section..."
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (newSectionInput.trim()) {
                                    const currentSections = editingMenu.sections || [];
                                    setEditingMenu({ ...editingMenu, sections: [...currentSections, newSectionInput.trim()] });
                                    setNewSectionInput("");
                                  }
                                }
                              }}
                              data-testid="input-new-section"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                if (newSectionInput.trim()) {
                                  const currentSections = editingMenu.sections || [];
                                  setEditingMenu({ ...editingMenu, sections: [...currentSections, newSectionInput.trim()] });
                                  setNewSectionInput("");
                                }
                              }}
                              disabled={!newSectionInput.trim()}
                              data-testid="button-add-section"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 border-t pt-4">
                        <Switch
                          id="edit-menu-active"
                          checked={editingMenu.isActive}
                          onCheckedChange={(checked) => setEditingMenu({ ...editingMenu, isActive: checked })}
                        />
                        <Label htmlFor="edit-menu-active" className="text-sm">Menu is Active (visible to guests)</Label>
                      </div>
                    </div>
                  </div>
                    </ScrollArea>

                    <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEditingMenu(null)}
                        disabled={updateMenuMutation.isPending}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={updateMenuMutation.isPending || !editingMenu.name.trim() || !editingMenu.slug.trim()}
                      >
                        {updateMenuMutation.isPending ? "Updating..." : "Update Menu"}
                      </Button>
                    </div>
                  </form>
                )}
              </DialogContent>
            </Dialog>
                </>
              )}

              {/* Drinks Section */}
              {activeSection === "drinks" && (
                <>
            {/* Manage Drinks Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Manage Drinks</CardTitle>
                <CardDescription>
                  Reorder drinks, activate/deactivate, or bulk delete
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Menu Selector */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="manage-menu">Select Menu</Label>
                    {defaultMenu && (
                      <Badge variant="outline" className="text-xs font-normal" data-testid="badge-default-menu">
                        Default: {defaultMenu.name}
                        {defaultMenu.isActive ? " (Active)" : ""}
                      </Badge>
                    )}
                  </div>
                  <Select
                    value={selectedMenuId || undefined}
                    onValueChange={(value) => {
                      setSelectedMenuId(value);
                      setSelectedDrinks(new Set());
                      setLocalDrinks([]);
                      setNewDrink(prev => ({
                        ...prev,
                        menuId: value,
                        sortOrder: getNextSortOrder(value),
                      }));
                    }}
                    disabled={menusLoading || !menus || menus.length === 0}
                  >
                    <SelectTrigger id="manage-menu" data-testid="select-manage-menu">
                      <SelectValue placeholder="Choose a menu to manage" />
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

                {selectedMenuId && (
                  <>
                    {/* Sticky Bulk Actions Bar */}
                    {localDrinks.length > 0 && (
                      <div className="sticky top-0 z-50 bg-background pb-4">
                        <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/20">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={toggleSelectAll}
                            data-testid="button-toggle-select-all"
                          >
                            {selectedDrinks.size === localDrinks.length ? "Deselect All" : "Select All"}
                          </Button>
                          
                          {selectedDrinks.size > 0 && (
                            <>
                              <div className="text-sm text-muted-foreground">
                                {selectedDrinks.size} selected
                              </div>
                              <div className="flex-1" />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  bulkUpdateMutation.mutate({
                                    drinkIds: Array.from(selectedDrinks),
                                    isActive: true,
                                  });
                                }}
                                disabled={bulkUpdateMutation.isPending}
                                data-testid="button-bulk-activate"
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Activate
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  bulkUpdateMutation.mutate({
                                    drinkIds: Array.from(selectedDrinks),
                                    isActive: false,
                                  });
                                }}
                                disabled={bulkUpdateMutation.isPending}
                                data-testid="button-bulk-deactivate"
                              >
                                <AlertCircle className="w-4 h-4 mr-1" />
                                Deactivate
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  if (confirm(`Delete ${selectedDrinks.size} drink(s)? This cannot be undone.`)) {
                                    bulkDeleteMutation.mutate(Array.from(selectedDrinks));
                                  }
                                }}
                                disabled={bulkDeleteMutation.isPending}
                                data-testid="button-bulk-delete"
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Drinks Grid with Drag and Drop */}
                    {allDrinksLoading ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <Skeleton key={i} className="h-64 w-full" />
                        ))}
                      </div>
                    ) : localDrinks.length > 0 ? (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={localDrinks.map(d => d.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="drinks-list">
                            {localDrinks.map((drink) => (
                              <SortableDrinkItem key={drink.id} drink={drink} />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        No drinks in this menu. Create drinks below!
                      </p>
                    )}
                  </>
                )}

                {!selectedMenuId && !menusLoading && menus && menus.length > 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Select a menu to manage its drinks
                  </p>
                )}

                {!menus || menus.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Create a menu first before managing drinks
                  </p>
                ) : null}
              </CardContent>
            </Card>

            {/* Edit Drink Dialog */}
            <Dialog open={!!editingDrink} onOpenChange={(open) => !open && setEditingDrink(null)}>
              <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Edit Drink</DialogTitle>
                  <DialogDescription>
                    Update drink information and settings
                  </DialogDescription>
                </DialogHeader>
                {editingDrink && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      updateDrinkMutation.mutate(editingDrink);
                    }}
                    className="flex flex-col flex-1 min-h-0"
                  >
                    <ScrollArea className="flex-1 pr-4">
                      <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-drink-name">Drink Name</Label>
                        <Input
                          id="edit-drink-name"
                          value={editingDrink.name}
                          onChange={(e) => setEditingDrink({ ...editingDrink, name: e.target.value })}
                          placeholder="Midnight Martini"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-drink-menu">Menu</Label>
                        <Select
                          value={editingDrink.menuId || "not_specified"}
                          onValueChange={(value) => {
                            const nextMenuId = value === "not_specified" ? "" : value;
                            const targetMenu = menus?.find(m => m.id === nextMenuId);
                            const targetSections = targetMenu?.sections || [];

                            setEditingDrink(prev => {
                              if (!prev) return prev;
                              const shouldResetSection = prev.section && !targetSections.includes(prev.section);
                              const nextSection = shouldResetSection ? "" : prev.section;
                              return {
                                ...prev,
                                menuId: nextMenuId,
                                section: nextSection,
                                sortOrder: nextMenuId ? getNextSortOrder(nextMenuId) : prev.sortOrder,
                              };
                            });
                          }}
                        >
                          <SelectTrigger id="edit-drink-menu" data-testid="select-edit-drink-menu">
                            <SelectValue placeholder="Select menu" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not_specified">Not Specified</SelectItem>
                            {(menus || []).map(menu => (
                              <SelectItem key={menu.id} value={menu.id}>
                                {menu.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-drink-section">Section</Label>
                        {(() => {
                          const drinkMenu = menus?.find(m => m.id === editingDrink.menuId);
                          const menuSections = drinkMenu?.sections || [];
                          // Include current section if it's not in the menu sections (for legacy drinks)
                          const currentSection = editingDrink.section;
                          const allSections = currentSection && !menuSections.includes(currentSection)
                            ? [currentSection, ...menuSections]
                            : menuSections;
                          return (
                            <Select
                              value={editingDrink.section || "not_specified"}
                              onValueChange={(value) => setEditingDrink({ ...editingDrink, section: value === "not_specified" ? "" : value })}
                            >
                              <SelectTrigger id="edit-drink-section" data-testid="select-edit-drink-section">
                                <SelectValue placeholder="Select section" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="not_specified">Not Specified</SelectItem>
                                {allSections.map((section, idx) => (
                                  <SelectItem key={idx} value={section}>
                                    {section}
                                    {currentSection === section && !menuSections.includes(section) && " (legacy)"}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-drink-style">Style</Label>
                      <Input
                        id="edit-drink-style"
                        value={editingDrink.style || ""}
                        onChange={(e) => setEditingDrink({ ...editingDrink, style: e.target.value })}
                        placeholder="Dry, Boozy"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-drink-description">Description</Label>
                      <Textarea
                        id="edit-drink-description"
                        value={editingDrink.description || ""}
                        onChange={(e) => setEditingDrink({ ...editingDrink, description: e.target.value })}
                        placeholder="A classic martini with a twist..."
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-drink-recipe">Recipe / Instructions</Label>
                      <Textarea
                        id="edit-drink-recipe"
                        value={editingDrink.recipe || ""}
                        onChange={(e) => setEditingDrink({ ...editingDrink, recipe: e.target.value })}
                        placeholder="2 oz gin, 0.5 oz dry vermouth, stir with ice..."
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-drink-base">Base Spirit</Label>
                        <Input
                          id="edit-drink-base"
                          value={editingDrink.baseSpirit || ""}
                          onChange={(e) => setEditingDrink({ ...editingDrink, baseSpirit: e.target.value })}
                          placeholder="Gin"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-drink-temperature">Temperature</Label>
                        <Select
                          value={editingDrink.temperature || "not_specified"}
                          onValueChange={(value) => setEditingDrink({ ...editingDrink, temperature: value === "not_specified" ? "" : value })}
                        >
                          <SelectTrigger id="edit-drink-temperature">
                            <SelectValue placeholder="Select temperature" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not_specified">Not Specified</SelectItem>
                            <SelectItem value="hot">Hot</SelectItem>
                            <SelectItem value="cold">Cold</SelectItem>
                            <SelectItem value="room_temp">Room Temperature</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="flex items-center gap-2">
                            <Switch
                              id="edit-drink-mocktail"
                              checked={editingDrink.isMocktail}
                              onCheckedChange={(checked) => setEditingDrink({ ...editingDrink, isMocktail: checked })}
                            />
                            <Label htmlFor="edit-drink-mocktail" className="text-sm">Non-Alcoholic</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              id="edit-drink-can-be-mocktail"
                              checked={editingDrink.canBeMocktail}
                              onCheckedChange={(checked) => setEditingDrink({ ...editingDrink, canBeMocktail: checked })}
                            />
                            <Label htmlFor="edit-drink-can-be-mocktail" className="text-sm">Mocktail Available</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              id="edit-drink-stirred"
                              checked={editingDrink.isStirred}
                              onCheckedChange={(checked) => setEditingDrink({ ...editingDrink, isStirred: checked })}
                            />
                            <Label htmlFor="edit-drink-stirred" className="text-sm">Stirred</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              id="edit-drink-shaken"
                              checked={editingDrink.isShaken}
                              onCheckedChange={(checked) => setEditingDrink({ ...editingDrink, isShaken: checked })}
                            />
                            <Label htmlFor="edit-drink-shaken" className="text-sm">Shaken</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              id="edit-drink-active"
                              checked={editingDrink.isActive}
                              onCheckedChange={(checked) => setEditingDrink({ ...editingDrink, isActive: checked })}
                            />
                            <Label htmlFor="edit-drink-active" className="text-sm">Active</Label>
                          </div>
                        </div>
                      </div>
                    </ScrollArea>

                    <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEditingDrink(null)}
                        disabled={updateDrinkMutation.isPending}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={updateDrinkMutation.isPending || !editingDrink.name.trim()}
                      >
                        {updateDrinkMutation.isPending ? "Updating..." : "Update Drink"}
                      </Button>
                    </div>
                  </form>
                )}
              </DialogContent>
            </Dialog>

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
                    if (newDrink.menuId && newDrink.name) {
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
                        onValueChange={(value) => setNewDrink(prev => ({
                          ...prev,
                          menuId: value,
                          sortOrder: getNextSortOrder(value),
                        }))}
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
                      {(() => {
                        const selectedMenu = menus?.find(m => m.id === newDrink.menuId);
                        const menuSections = selectedMenu?.sections || [];
                        return (
                          <Select
                            value={newDrink.section || "not_specified"}
                            onValueChange={(value) => setNewDrink({ ...newDrink, section: value === "not_specified" ? "" : value })}
                            disabled={createDrinkMutation.isPending || !newDrink.menuId}
                          >
                            <SelectTrigger id="drink-section" data-testid="select-drink-section">
                              <SelectValue placeholder="Select section" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="not_specified">Not Specified</SelectItem>
                              {menuSections.map((section, idx) => (
                                <SelectItem key={idx} value={section}>{section}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        );
                      })()}
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <div className="space-y-2">
                      <Label htmlFor="drink-temperature">Temperature</Label>
                      <Select
                        value={newDrink.temperature || "not_specified"}
                        onValueChange={(value) => setNewDrink({ ...newDrink, temperature: value === "not_specified" ? "" : value })}
                        disabled={createDrinkMutation.isPending}
                      >
                        <SelectTrigger id="drink-temperature" data-testid="select-drink-temperature">
                          <SelectValue placeholder="Select temperature" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_specified">Not Specified</SelectItem>
                          <SelectItem value="hot">Hot</SelectItem>
                          <SelectItem value="cold">Cold</SelectItem>
                          <SelectItem value="room_temp">Room Temperature</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="drink-mocktail"
                        checked={newDrink.isMocktail}
                        onCheckedChange={(checked) => setNewDrink({ ...newDrink, isMocktail: checked })}
                        disabled={createDrinkMutation.isPending}
                        data-testid="switch-drink-mocktail"
                      />
                      <Label htmlFor="drink-mocktail" className="text-sm">Non-Alcoholic</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="drink-can-be-mocktail"
                        checked={newDrink.canBeMocktail}
                        onCheckedChange={(checked) => setNewDrink({ ...newDrink, canBeMocktail: checked })}
                        disabled={createDrinkMutation.isPending}
                        data-testid="switch-drink-can-be-mocktail"
                      />
                      <Label htmlFor="drink-can-be-mocktail" className="text-sm">Mocktail Available</Label>
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
                    <div className="flex items-center gap-2">
                      <Switch
                        id="drink-active"
                        checked={newDrink.isActive}
                        onCheckedChange={(checked) => setNewDrink({ ...newDrink, isActive: checked })}
                        disabled={createDrinkMutation.isPending}
                        data-testid="switch-drink-active"
                      />
                      <Label htmlFor="drink-active" className="text-sm">Active</Label>
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
                    disabled={createDrinkMutation.isPending || !newDrink.menuId || !newDrink.name.trim()}
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
                </>
              )}

              {/* QR Codes Section */}
              {activeSection === "qr-codes" && (
                <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* QR Code Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Home Page QR Code</CardTitle>
                  <CardDescription>
                    QR code for the main landing page showing all active menus
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center gap-4">
                    <div className="bg-white p-6 rounded-lg border" style={{ backgroundColor: qrBgColor }}>
                      <QRCodeSVG
                        value={baseUrl}
                        size={qrSize}
                        level={qrLevel}
                        includeMargin={qrIncludeMargin}
                        fgColor={qrFgColor}
                        bgColor={qrBgColor}
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

              {/* QR Code Customization */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">QR Code Styling</CardTitle>
                  <CardDescription>
                    Customize the appearance of your QR codes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="qr-size">Size: {qrSize}px</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="qr-size"
                        type="range"
                        min="128"
                        max="512"
                        step="16"
                        value={qrSize}
                        onChange={(e) => setQrSize(parseInt(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground min-w-[60px]">{qrSize}px</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="qr-fg-color">Foreground Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="qr-fg-color"
                          type="color"
                          value={qrFgColor}
                          onChange={(e) => setQrFgColor(e.target.value)}
                          className="h-10 w-20"
                        />
                        <Input
                          type="text"
                          value={qrFgColor}
                          onChange={(e) => setQrFgColor(e.target.value)}
                          placeholder="#000000"
                          className="flex-1 font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="qr-bg-color">Background Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="qr-bg-color"
                          type="color"
                          value={qrBgColor}
                          onChange={(e) => setQrBgColor(e.target.value)}
                          className="h-10 w-20"
                        />
                        <Input
                          type="text"
                          value={qrBgColor}
                          onChange={(e) => setQrBgColor(e.target.value)}
                          placeholder="#ffffff"
                          className="flex-1 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="qr-level">Error Correction Level</Label>
                    <Select value={qrLevel} onValueChange={(value: "L" | "M" | "Q" | "H") => setQrLevel(value)}>
                      <SelectTrigger id="qr-level">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="L">Low (7% recovery)</SelectItem>
                        <SelectItem value="M">Medium (15% recovery)</SelectItem>
                        <SelectItem value="Q">Quartile (25% recovery)</SelectItem>
                        <SelectItem value="H">High (30% recovery)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Higher levels allow the QR code to be read even if partially damaged or obscured
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="qr-margin"
                      checked={qrIncludeMargin}
                      onCheckedChange={setQrIncludeMargin}
                    />
                    <Label htmlFor="qr-margin" className="text-sm">Include quiet zone margin</Label>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="text-sm font-semibold mb-2">Quick Presets</h3>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setQrFgColor("#000000");
                          setQrBgColor("#ffffff");
                          setQrSize(200);
                        }}
                      >
                        Classic
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setQrFgColor("#1a1a1a");
                          setQrBgColor("#f5f5f5");
                          setQrSize(256);
                        }}
                      >
                        Elegant
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setQrFgColor("#8b5cf6");
                          setQrBgColor("#faf5ff");
                          setQrSize(300);
                        }}
                      >
                        Purple
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setQrFgColor("#ef4444");
                          setQrBgColor("#fef2f2");
                          setQrSize(300);
                        }}
                      >
                        Red
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
                </>
              )}

              {/* Settings Section */}
              {activeSection === "settings" && (
                <>
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-xl">Application Settings</CardTitle>
                        <CardDescription>
                          System configuration and information
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-2">
                          <h3 className="text-sm font-semibold">Dashboard Access</h3>
                          <p className="text-sm text-muted-foreground">
                            Username: <span className="font-mono">admin</span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Password: Configured via <span className="font-mono">DASHBOARD_PASSWORD</span> environment variable
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            To change the password, update the environment variable in your Replit project settings
                          </p>
                        </div>

                        <div className="space-y-2 border-t pt-4">
                          <h3 className="text-sm font-semibold">Session Security</h3>
                          <p className="text-sm text-muted-foreground">
                            Sessions use encrypted HTTP-only cookies with secure session storage
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Session secret: Configured via <span className="font-mono">SESSION_SECRET</span> environment variable
                          </p>
                        </div>

                        <div className="space-y-2 border-t pt-4">
                          <h3 className="text-sm font-semibold">Database</h3>
                          <p className="text-sm text-muted-foreground">
                            PostgreSQL database via Neon serverless driver
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Connection: Configured via <span className="font-mono">DATABASE_URL</span> environment variable
                          </p>
                        </div>

                        <div className="space-y-2 border-t pt-4">
                          <h3 className="text-sm font-semibold">Application Version</h3>
                          <p className="text-sm text-muted-foreground">
                            Bar Flores Cocktail Management System
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Built with React, Express, and PostgreSQL
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
                </div>
              </main>
            </div>
          </div>
        </SidebarProvider>
      </TabsContent>
    </Tabs>
  );
}
