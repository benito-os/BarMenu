import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useOrders } from "@/hooks/useOrders";
import { useSettings } from "@/hooks/useSettings";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Clock, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, MessageSquare, Leaf, Trash2, Play, Ban, RotateCcw, Pencil, Check, X, Volume2, VolumeX, Keyboard } from "lucide-react";
import type { OrderWithDrink } from "@shared/validation";

const ALERT_PREF_KEY = "barflores_queue_alerts";
const ORIGINAL_TITLE = "Bar Flores";

/**
 * Split a recipe string into discrete steps for line-by-line display in the
 * queue. Honors author-supplied newlines first; falls back to comma splitting
 * when the recipe is a single line with multiple commas (the common
 * "2oz gin, 0.5oz vermouth, bitters" pattern). Returns the original string as
 * a one-element array if neither heuristic applies, so single-step recipes
 * like "Stir with ice and strain" stay intact.
 */
function splitRecipe(recipe: string): string[] {
  const lines = recipe
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (lines.length > 1) return lines;
  if (lines.length === 0) return [];

  const sole = lines[0];
  const commaParts = sole.split(",").map((s) => s.trim()).filter(Boolean);
  if (commaParts.length >= 2) return commaParts;
  return [sole];
}

export default function QueuePage() {
  const { toast } = useToast();
  const {
    queue,
    queueLoading,
    markInProgress,
    markServed,
    inProgressPending,
    servedPending,
    batchUpdate,
    batchUpdatePending,
    clearServed,
    clearServedPending,
    editDetails,
    editDetailsPending,
  } = useOrders(true);
  const { settings } = useSettings();
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDrink | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingDetails, setEditingDetails] = useState(false);
  const [detailsDraft, setDetailsDraft] = useState<{
    guestName: string;
    comments: string;
    asMocktail: boolean;
  }>({ guestName: "", comments: "", asMocktail: false });
  const [alertsEnabled, setAlertsEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(ALERT_PREF_KEY) !== "off";
  });
  const [showShortcuts, setShowShortcuts] = useState(false);
  const previousPendingCountRef = useRef<number | null>(null);

  // Pending count = orders awaiting bartender action (excludes served).
  const pendingCount = queue.filter(
    (o) => o.status === "requested" || o.status === "in_progress",
  ).length;

  // Audio + tab-title notification when the pending queue grows.
  useEffect(() => {
    const prev = previousPendingCountRef.current;
    previousPendingCountRef.current = pendingCount;

    // Skip the very first render — we don't want to alert on initial load.
    if (prev === null) return;

    if (pendingCount > prev && alertsEnabled) {
      try {
        const AudioCtx =
          (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
            .AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          // Pleasant two-note chime (E5 then G5).
          [
            { freq: 659.25, start: 0 },
            { freq: 783.99, start: 0.15 },
          ].forEach(({ freq, start }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
            gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + 0.25);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + start);
            osc.stop(ctx.currentTime + start + 0.3);
          });
        }
      } catch {
        // Audio is best-effort; don't surface errors.
      }
    }
  }, [pendingCount, alertsEnabled]);

  // Tab title badge so the bartender can leave the tab in the background.
  useEffect(() => {
    document.title = pendingCount > 0 ? `(${pendingCount}) ${ORIGINAL_TITLE}` : ORIGINAL_TITLE;
    return () => {
      document.title = ORIGINAL_TITLE;
    };
  }, [pendingCount]);

  const toggleAlerts = () => {
    setAlertsEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(ALERT_PREF_KEY, next ? "on" : "off");
      return next;
    });
  };

  const startEditDetails = (order: OrderWithDrink) => {
    setDetailsDraft({
      guestName: order.guestName ?? "",
      comments: order.comments ?? "",
      asMocktail: order.asMocktail,
    });
    setEditingDetails(true);
  };

  const saveEditDetails = () => {
    if (!selectedOrder) return;
    editDetails({
      orderId: selectedOrder.id,
      data: {
        guestName: detailsDraft.guestName.trim() === "" ? null : detailsDraft.guestName.trim(),
        comments: detailsDraft.comments.trim() === "" ? null : detailsDraft.comments.trim(),
        asMocktail: detailsDraft.asMocktail,
      },
    });
    setEditingDetails(false);
  };

  // Reset edit state when the drawer closes or order changes.
  useEffect(() => {
    if (!selectedOrder) setEditingDetails(false);
  }, [selectedOrder]);

  // Keyboard shortcuts: s = start oldest requested, d = serve oldest in-progress,
  // ? = show help. Skip when a text input has focus or the detail drawer is open
  // so typing into Edit form / search inputs doesn't accidentally fire actions.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inEditableField =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (inEditableField) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
        return;
      }
      if (e.key === "s" || e.key === "S") {
        const oldest = queue
          .filter((o) => o.status === "requested")
          .sort((a, b) => new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime())[0];
        if (oldest) {
          e.preventDefault();
          markInProgress(oldest.id);
        }
      } else if (e.key === "d" || e.key === "D") {
        const oldest = queue
          .filter((o) => o.status === "in_progress")
          .sort((a, b) => new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime())[0];
        if (oldest) {
          e.preventDefault();
          markServed(oldest.id);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [queue, markInProgress, markServed]);

  // 86 toggle mutation for marking drinks out of stock
  const toggleStockMutation = useMutation({
    mutationFn: async ({ drinkId, isOutOfStock }: { drinkId: string; isOutOfStock: boolean }) => {
      return apiRequest("PATCH", `/api/drinks/${drinkId}`, { isOutOfStock });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/queue"] });
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === "/api/drinks/all"
      });
      
      // Update selectedOrder state to reflect the change immediately in the drawer
      if (selectedOrder && selectedOrder.drinkId === variables.drinkId) {
        setSelectedOrder({
          ...selectedOrder,
          drinkIsOutOfStock: variables.isOutOfStock,
        });
      }
      
      toast({
        title: variables.isOutOfStock ? "Drink 86'd" : "Drink Restocked",
        description: variables.isOutOfStock 
          ? "This drink is now marked as out of stock" 
          : "This drink is now available again",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update drink stock status",
        variant: "destructive",
      });
    },
  });

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getWaitingTime = (dateString: string): { minutes: number; display: string } => {
    const orderTime = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - orderTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return { minutes: 0, display: "<1m" };
    if (diffMins >= 60) {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return { minutes: diffMins, display: `${hours}h ${mins}m` };
    }
    return { minutes: diffMins, display: `${diffMins}m` };
  };

  const getWaitingBadge = (dateString: string, status: string) => {
    if (status === "served") return null;
    
    const { minutes, display } = getWaitingTime(dateString);
    const urgentThreshold = settings.waitingUrgentMinutes;
    const warningThreshold = settings.waitingWarningMinutes;
    
    if (minutes >= urgentThreshold) {
      return (
        <Badge variant="destructive" className="text-xs font-mono" data-testid="badge-wait-urgent">
          <Clock className="w-3 h-3 mr-1" />
          {display}
        </Badge>
      );
    }
    if (minutes >= warningThreshold) {
      return (
        <Badge className="bg-warning text-warning-foreground hover:bg-warning/90 text-xs font-mono" data-testid="badge-wait-warning">
          <Clock className="w-3 h-3 mr-1" />
          {display}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-xs font-mono" data-testid="badge-wait-normal">
        <Clock className="w-3 h-3 mr-1" />
        {display}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "requested":
        return <Badge className="bg-info text-info-foreground hover:bg-info/90">Requested</Badge>;
      case "in_progress":
        return <Badge className="bg-warning text-warning-foreground hover:bg-warning/90">In Progress</Badge>;
      case "served":
        return <Badge className="bg-success text-success-foreground hover:bg-success/90">Served</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  };

  const toggleSelect = (orderId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === queue.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(queue.map(o => o.id)));
    }
  };

  const handleBatchStart = () => {
    const requestedIds = Array.from(selectedIds).filter(id => 
      queue.find(o => o.id === id)?.status === "requested"
    );
    if (requestedIds.length > 0) {
      batchUpdate({ orderIds: requestedIds, status: "in_progress" });
      setSelectedIds(new Set());
    }
  };

  const handleBatchServe = () => {
    const inProgressIds = Array.from(selectedIds).filter(id => 
      queue.find(o => o.id === id)?.status === "in_progress"
    );
    if (inProgressIds.length > 0) {
      batchUpdate({ orderIds: inProgressIds, status: "served" });
      setSelectedIds(new Set());
    }
  };

  const handleClearServed = () => {
    clearServed();
    setSelectedIds(new Set());
  };

  const servedCount = queue.filter(o => o.status === "served").length;
  const requestedSelected = Array.from(selectedIds).filter(id => 
    queue.find(o => o.id === id)?.status === "requested"
  ).length;
  const inProgressSelected = Array.from(selectedIds).filter(id => 
    queue.find(o => o.id === id)?.status === "in_progress"
  ).length;

  // Mobile card component for each order - optimized for small screens (375px+)
  const MobileOrderCard = ({ order }: { order: OrderWithDrink }) => {
    const isExpanded = expandedOrderId === order.id;
    const isSelected = selectedIds.has(order.id);
    const waitingBadge = getWaitingBadge(order.requestedAt.toString(), order.status);
    const isOutOfStock = order.drinkIsOutOfStock;
    
    return (
      <div 
        className={`border rounded-lg mb-2 overflow-hidden ${isSelected ? "ring-2 ring-primary" : ""} ${isOutOfStock ? "border-destructive/50 bg-destructive/5" : ""}`}
        data-testid={`mobile-order-${order.id}`}
      >
        <Collapsible
          open={isExpanded}
          onOpenChange={() => toggleExpand(order.id)}
        >
          <CollapsibleTrigger className="w-full">
            <div className="p-2.5 hover-elevate">
              {/* Row 1: Checkbox + Drink name + expand icon */}
              <div className="flex items-center gap-2">
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(order.id);
                  }}
                  className="shrink-0"
                >
                  <Checkbox 
                    checked={isSelected}
                    data-testid={`mobile-checkbox-${order.id}`}
                  />
                </div>
                <span className="font-serif font-medium text-sm truncate flex-1 text-left">
                  {order.drinkName}
                </span>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </div>
              
              {/* Row 2: Guest + Time + Comment indicator */}
              <div className="flex items-center gap-1.5 mt-1 ml-6 text-xs text-muted-foreground">
                <span className="truncate max-w-[80px]">{order.guestName || "Guest"}</span>
                <span>•</span>
                <span className="shrink-0">{formatTime(order.requestedAt.toString())}</span>
                {order.comments && <MessageSquare className="w-3 h-3 shrink-0" />}
              </div>
              
              {/* Row 3: Badges */}
              <div className="flex items-center gap-1.5 mt-1.5 ml-6 flex-wrap">
                {isOutOfStock && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0" data-testid={`badge-86-${order.id}`}>
                    <Ban className="w-2.5 h-2.5 mr-0.5" />
                    86'd
                  </Badge>
                )}
                {waitingBadge}
                {getStatusBadge(order.status)}
                {order.asMocktail && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    <Leaf className="w-2.5 h-2.5 mr-0.5" />
                    Mocktail
                  </Badge>
                )}
              </div>
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="px-2.5 pb-2.5 pt-1.5 border-t bg-muted/30 space-y-2">
              {/* Out of stock warning */}
              {isOutOfStock && (
                <div className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1.5">
                  This drink is out of stock — alert the guest
                </div>
              )}
              
              {order.comments && (
                <div className="text-xs">
                  <span className="font-medium">Notes: </span>
                  <span className="text-muted-foreground">{order.comments}</span>
                </div>
              )}
              
              {order.drinkRecipe && order.drinkRecipe !== "-" && (
                <div className="text-xs">
                  <span className="font-medium">Recipe: </span>
                  <span className="text-muted-foreground line-clamp-2">{order.drinkRecipe}</span>
                </div>
              )}
              
              <div className="flex flex-wrap gap-1 text-xs">
                {order.drinkBaseSpirit && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">{order.drinkBaseSpirit}</Badge>
                )}
                {order.drinkTemperature && order.drinkTemperature !== "Not Specified" && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">{order.drinkTemperature}</Badge>
                )}
                {order.drinkIsStirred && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Stirred</Badge>}
                {order.drinkIsShaken && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Shaken</Badge>}
              </div>
              
              {/* Action buttons - stacked for very small screens */}
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                {order.status === "requested" && (
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      markInProgress(order.id);
                    }}
                    disabled={inProgressPending}
                    data-testid={`mobile-button-in-progress-${order.id}`}
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Start
                  </Button>
                )}
                {order.status === "in_progress" && (
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      markServed(order.id);
                    }}
                    disabled={servedPending}
                    data-testid={`mobile-button-serve-${order.id}`}
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Served
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedOrder(order);
                  }}
                  data-testid={`mobile-button-details-${order.id}`}
                >
                  Details
                </Button>
                <Button
                  size="sm"
                  variant={isOutOfStock ? "secondary" : "outline"}
                  className="h-8 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleStockMutation.mutate({ 
                      drinkId: order.drinkId, 
                      isOutOfStock: !isOutOfStock 
                    });
                  }}
                  disabled={toggleStockMutation.isPending}
                  data-testid={`mobile-button-86-${order.id}`}
                >
                  {isOutOfStock ? (
                    <>
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Restock
                    </>
                  ) : (
                    <>
                      <Ban className="w-3 h-3 mr-1" />
                      86 Drink
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-full">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-2xl">Live Order Queue</CardTitle>
                  <CardDescription>
                    Live view of drink requests — auto-refreshes every 5 seconds
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleAlerts}
                    title={alertsEnabled ? "Disable new-order chime" : "Enable new-order chime"}
                    data-testid="button-toggle-alerts"
                  >
                    {alertsEnabled ? (
                      <Volume2 className="w-4 h-4" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowShortcuts((prev) => !prev)}
                    title="Keyboard shortcuts (press ?)"
                    data-testid="button-shortcuts-help"
                  >
                    <Keyboard className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {showShortcuts && (
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground space-y-1">
                  <div><kbd className="px-1.5 py-0.5 bg-background border rounded">S</kbd> Start oldest requested order</div>
                  <div><kbd className="px-1.5 py-0.5 bg-background border rounded">D</kbd> Serve oldest in-progress order</div>
                  <div><kbd className="px-1.5 py-0.5 bg-background border rounded">?</kbd> Toggle this help</div>
                </div>
              )}

              {/* Bulk Actions */}
              {queue.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedIds.size > 0 && requestedSelected > 0 && (
                    <Button
                      size="sm"
                      onClick={handleBatchStart}
                      disabled={batchUpdatePending}
                      data-testid="button-batch-start"
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Start {requestedSelected}
                    </Button>
                  )}
                  {selectedIds.size > 0 && inProgressSelected > 0 && (
                    <Button
                      size="sm"
                      onClick={handleBatchServe}
                      disabled={batchUpdatePending}
                      data-testid="button-batch-serve"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Serve {inProgressSelected}
                    </Button>
                  )}
                  {servedCount > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleClearServed}
                      disabled={clearServedPending}
                      data-testid="button-clear-served"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Clear {servedCount} Served
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {queueLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : queue && queue.length > 0 ? (
              <>
                {/* Mobile view - collapsible cards */}
                <div className="md:hidden" data-testid="queue-mobile-view">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                    <Checkbox 
                      checked={selectedIds.size === queue.length && queue.length > 0}
                      onCheckedChange={selectAll}
                      data-testid="mobile-checkbox-all"
                    />
                    <span className="text-sm text-muted-foreground">
                      {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
                    </span>
                  </div>
                  {queue.map((order) => (
                    <MobileOrderCard key={order.id} order={order} />
                  ))}
                </div>

                {/* Desktop view - full table */}
                <div className="hidden md:block overflow-x-auto" data-testid="queue-desktop-view">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox 
                            checked={selectedIds.size === queue.length && queue.length > 0}
                            onCheckedChange={selectAll}
                            data-testid="checkbox-all"
                          />
                        </TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Wait</TableHead>
                        <TableHead>Guest</TableHead>
                        <TableHead>Drink</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {queue.map((order) => (
                        <TableRow 
                          key={order.id}
                          data-testid={`row-order-${order.id}`}
                          className={`cursor-pointer hover-elevate ${selectedIds.has(order.id) ? "bg-muted/50" : ""} ${order.drinkIsOutOfStock ? "bg-destructive/5 border-l-2 border-l-destructive" : ""}`}
                          onClick={() => setSelectedOrder(order)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox 
                              checked={selectedIds.has(order.id)}
                              onCheckedChange={() => toggleSelect(order.id)}
                              data-testid={`checkbox-${order.id}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium whitespace-nowrap">
                            {formatTime(order.requestedAt.toString())}
                          </TableCell>
                          <TableCell>
                            {getWaitingBadge(order.requestedAt.toString(), order.status)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {order.guestName || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-serif">{order.drinkName}</span>
                              {order.drinkIsOutOfStock && (
                                <Badge variant="destructive" className="text-xs">
                                  <Ban className="w-3 h-3 mr-1" />
                                  86'd
                                </Badge>
                              )}
                              {order.asMocktail && (
                                <Badge variant="outline" className="text-xs">
                                  <Leaf className="w-3 h-3 mr-1" />
                                  Mocktail
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px]">
                            {order.comments ? (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <MessageSquare className="w-3 h-3 shrink-0" />
                                <span className="truncate">{order.comments}</span>
                              </span>
                            ) : "-"}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(order.status)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {order.status === "requested" && (
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markInProgress(order.id);
                                  }}
                                  disabled={inProgressPending}
                                  data-testid={`button-in-progress-${order.id}`}
                                >
                                  <Clock className="w-4 h-4 mr-2" />
                                  Start
                                </Button>
                              )}
                              {order.status === "in_progress" && (
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markServed(order.id);
                                  }}
                                  disabled={servedPending}
                                  data-testid={`button-serve-${order.id}`}
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                  Served
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant={order.drinkIsOutOfStock ? "secondary" : "outline"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleStockMutation.mutate({ 
                                    drinkId: order.drinkId, 
                                    isOutOfStock: !order.drinkIsOutOfStock 
                                  });
                                }}
                                disabled={toggleStockMutation.isPending}
                                data-testid={`button-86-${order.id}`}
                                title={order.drinkIsOutOfStock ? "Restock drink" : "86 this drink"}
                              >
                                {order.drinkIsOutOfStock ? (
                                  <RotateCcw className="w-4 h-4" />
                                ) : (
                                  <Ban className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
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
                  {/* Out of Stock Alert */}
                  {selectedOrder.drinkIsOutOfStock && (
                    <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 flex items-center gap-2">
                      <Ban className="w-4 h-4 shrink-0" />
                      <span>This drink is out of stock — alert the guest</span>
                    </div>
                  )}

                  {/* Waiting Time & Status */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {selectedOrder.drinkIsOutOfStock && (
                      <Badge variant="destructive">
                        <Ban className="w-3 h-3 mr-1" />
                        86'd
                      </Badge>
                    )}
                    {getWaitingBadge(selectedOrder.requestedAt.toString(), selectedOrder.status)}
                    {getStatusBadge(selectedOrder.status)}
                    {selectedOrder.asMocktail && (
                      <Badge variant="outline">
                        <Leaf className="w-3 h-3 mr-1" />
                        Mocktail
                      </Badge>
                    )}
                  </div>

                  {/* Editable guest details block. Edit is gated on pre-served
                      orders since "served"/"cancelled" are final states. */}
                  {(() => {
                    const isFinal = selectedOrder.status === "served" || selectedOrder.status === "cancelled";
                    if (editingDetails) {
                      return (
                        <div className="space-y-3 rounded-md border p-3">
                          <div className="space-y-2">
                            <Label htmlFor="edit-guest-name">Guest name</Label>
                            <Input
                              id="edit-guest-name"
                              value={detailsDraft.guestName}
                              onChange={(e) =>
                                setDetailsDraft((prev) => ({ ...prev, guestName: e.target.value }))
                              }
                              placeholder="Optional"
                              data-testid="input-edit-guest-name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-comments">Special requests</Label>
                            <Textarea
                              id="edit-comments"
                              value={detailsDraft.comments}
                              onChange={(e) =>
                                setDetailsDraft((prev) => ({ ...prev, comments: e.target.value }))
                              }
                              placeholder="Notes for the bartender"
                              rows={2}
                              data-testid="input-edit-comments"
                            />
                          </div>
                          {selectedOrder.drinkCanBeMocktail && (
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="edit-mocktail"
                                checked={detailsDraft.asMocktail}
                                onCheckedChange={(checked) =>
                                  setDetailsDraft((prev) => ({
                                    ...prev,
                                    asMocktail: checked === true,
                                  }))
                                }
                                data-testid="checkbox-edit-mocktail"
                              />
                              <Label htmlFor="edit-mocktail" className="cursor-pointer">
                                As mocktail
                              </Label>
                            </div>
                          )}
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingDetails(false)}
                              data-testid="button-cancel-edit-details"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={saveEditDetails}
                              disabled={editDetailsPending}
                              data-testid="button-save-edit-details"
                            >
                              <Check className="w-4 h-4 mr-1" />
                              {editDetailsPending ? "Saving..." : "Save"}
                            </Button>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">Guest details</h3>
                          {!isFinal && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditDetails(selectedOrder)}
                              data-testid="button-edit-details"
                            >
                              <Pencil className="w-3.5 h-3.5 mr-1" />
                              Edit
                            </Button>
                          )}
                        </div>
                        <div className="text-sm space-y-2">
                          <div>
                            <span className="text-muted-foreground">Name: </span>
                            <span>{selectedOrder.guestName || "—"}</span>
                          </div>
                          {selectedOrder.comments && (
                            <div className="bg-muted/50 p-3 rounded-md">
                              <span className="text-muted-foreground">Special requests: </span>
                              {selectedOrder.comments}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {selectedOrder.drinkRecipe && (
                    <div>
                      <h3 className="font-semibold mb-2">Recipe & Instructions</h3>
                      {(() => {
                        const steps = splitRecipe(selectedOrder.drinkRecipe);
                        if (steps.length <= 1) {
                          return (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                              {steps[0] ?? selectedOrder.drinkRecipe}
                            </p>
                          );
                        }
                        return (
                          <ul className="text-sm leading-relaxed space-y-1 list-disc list-inside marker:text-muted-foreground">
                            {steps.map((step, i) => (
                              <li key={i}>{step}</li>
                            ))}
                          </ul>
                        );
                      })()}
                    </div>
                  )}

                  {selectedOrder.drinkDescription && (
                    <div>
                      <h3 className="font-semibold mb-2">Description</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{selectedOrder.drinkDescription}</p>
                    </div>
                  )}

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

                  <div className="pt-4 border-t space-y-3">
                    {selectedOrder.status === "requested" && (
                      <Button
                        className="w-full"
                        onClick={() => {
                          markInProgress(selectedOrder.id);
                          setSelectedOrder(null);
                        }}
                        disabled={inProgressPending}
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
                          markServed(selectedOrder.id);
                          setSelectedOrder(null);
                        }}
                        disabled={servedPending}
                        data-testid="sheet-button-mark-served"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Mark as Served
                      </Button>
                    )}
                    <Button
                      variant={selectedOrder.drinkIsOutOfStock ? "secondary" : "outline"}
                      className="w-full"
                      onClick={() => {
                        toggleStockMutation.mutate({ 
                          drinkId: selectedOrder.drinkId, 
                          isOutOfStock: !selectedOrder.drinkIsOutOfStock 
                        });
                      }}
                      disabled={toggleStockMutation.isPending}
                      data-testid="sheet-button-86"
                    >
                      {selectedOrder.drinkIsOutOfStock ? (
                        <>
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Restock Drink
                        </>
                      ) : (
                        <>
                          <Ban className="w-4 h-4 mr-2" />
                          86 This Drink
                        </>
                      )}
                    </Button>
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
      </div>
    </DashboardLayout>
  );
}
