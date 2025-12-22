import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useOrders } from "@/hooks/useOrders";
import { useMenus } from "@/hooks/useMenus";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, MessageSquare, Leaf, Trash2, Play, Menu } from "lucide-react";
import type { OrderWithDrink } from "@shared/validation";

export default function QueuePage() {
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
    clearServedPending
  } = useOrders(true);
  const { menus, menusLoading, toggleMenu } = useMenus(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDrink | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const activeMenu = menus.find(m => m.isActive);

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
    
    if (minutes >= 5) {
      return (
        <Badge variant="destructive" className="text-xs font-mono" data-testid="badge-wait-urgent">
          <Clock className="w-3 h-3 mr-1" />
          {display}
        </Badge>
      );
    }
    if (minutes >= 3) {
      return (
        <Badge className="bg-yellow-500 hover:bg-yellow-600 text-xs font-mono" data-testid="badge-wait-warning">
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
        return <Badge variant="default" className="bg-blue-500">Requested</Badge>;
      case "in_progress":
        return <Badge variant="default" className="bg-yellow-500">In Progress</Badge>;
      case "served":
        return <Badge variant="default" className="bg-green-500">Served</Badge>;
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

  // Mobile card component for each order
  const MobileOrderCard = ({ order }: { order: OrderWithDrink }) => {
    const isExpanded = expandedOrderId === order.id;
    const isSelected = selectedIds.has(order.id);
    const waitingBadge = getWaitingBadge(order.requestedAt.toString(), order.status);
    
    return (
      <div 
        className={`border rounded-lg mb-2 overflow-hidden ${isSelected ? "ring-2 ring-primary" : ""}`}
        data-testid={`mobile-order-${order.id}`}
      >
        <div className="flex items-center">
          <div 
            className="p-3 flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              toggleSelect(order.id);
            }}
          >
            <Checkbox 
              checked={isSelected}
              data-testid={`mobile-checkbox-${order.id}`}
            />
          </div>
          <Collapsible
            open={isExpanded}
            onOpenChange={() => toggleExpand(order.id)}
            className="flex-1"
          >
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-3 pl-0 hover-elevate">
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-serif font-medium truncate">{order.drinkName}</span>
                    {order.asMocktail && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        <Leaf className="w-3 h-3 mr-1" />
                        Mocktail
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <span>{order.guestName || "Guest"}</span>
                    <span>•</span>
                    <span>{formatTime(order.requestedAt.toString())}</span>
                    {order.comments && (
                      <>
                        <span>•</span>
                        <MessageSquare className="w-3 h-3" />
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {waitingBadge}
                  {getStatusBadge(order.status)}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="px-3 pb-3 pt-1 border-t bg-muted/30 space-y-3">
                {order.comments && (
                  <div className="text-sm">
                    <span className="font-medium">Notes: </span>
                    <span className="text-muted-foreground">{order.comments}</span>
                  </div>
                )}
                
                {order.drinkRecipe && (
                  <div className="text-sm">
                    <span className="font-medium">Recipe: </span>
                    <span className="text-muted-foreground line-clamp-2">{order.drinkRecipe}</span>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2 text-xs">
                  {order.drinkBaseSpirit && (
                    <Badge variant="outline">{order.drinkBaseSpirit}</Badge>
                  )}
                  {order.drinkTemperature && order.drinkTemperature !== "Not Specified" && (
                    <Badge variant="outline">{order.drinkTemperature}</Badge>
                  )}
                  {order.drinkIsStirred && <Badge variant="outline">Stirred</Badge>}
                  {order.drinkIsShaken && <Badge variant="outline">Shaken</Badge>}
                </div>
                
                <div className="flex gap-2 pt-2">
                  {order.status === "requested" && (
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        markInProgress(order.id);
                      }}
                      disabled={inProgressPending}
                      data-testid={`mobile-button-in-progress-${order.id}`}
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Start
                    </Button>
                  )}
                  {order.status === "in_progress" && (
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        markServed(order.id);
                      }}
                      disabled={servedPending}
                      data-testid={`mobile-button-serve-${order.id}`}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Served
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOrder(order);
                    }}
                    data-testid={`mobile-button-details-${order.id}`}
                  >
                    Full Details
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-full">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl">Live Order Queue</CardTitle>
                  <CardDescription>
                    Live view of drink requests - auto-refreshes every 5 seconds
                  </CardDescription>
                </div>
                
                {/* Active Menu Selector */}
                <div className="flex items-center gap-2">
                  <Menu className="w-4 h-4 text-muted-foreground" />
                  <Select
                    value={activeMenu?.id || ""}
                    onValueChange={(menuId) => {
                      if (menuId !== activeMenu?.id) {
                        toggleMenu({ id: menuId, isActive: true });
                      }
                    }}
                    disabled={menusLoading}
                  >
                    <SelectTrigger 
                      className="w-[200px]" 
                      data-testid="select-active-menu"
                    >
                      <SelectValue placeholder="Select active menu" />
                    </SelectTrigger>
                    <SelectContent>
                      {menus.map((menu) => (
                        <SelectItem key={menu.id} value={menu.id}>
                          <div className="flex items-center gap-2">
                            {menu.name}
                            {menu.isActive && (
                              <Badge variant="secondary" className="text-xs">Active</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
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
                          className={`cursor-pointer hover-elevate ${selectedIds.has(order.id) ? "bg-muted/50" : ""}`}
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
                  {/* Waiting Time & Status */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {getWaitingBadge(selectedOrder.requestedAt.toString(), selectedOrder.status)}
                    {getStatusBadge(selectedOrder.status)}
                    {selectedOrder.asMocktail && (
                      <Badge variant="outline">
                        <Leaf className="w-3 h-3 mr-1" />
                        Mocktail
                      </Badge>
                    )}
                  </div>

                  {selectedOrder.guestName && (
                    <div>
                      <h3 className="font-semibold mb-2">Guest Name</h3>
                      <p className="text-muted-foreground">{selectedOrder.guestName}</p>
                    </div>
                  )}

                  {selectedOrder.comments && (
                    <div>
                      <h3 className="font-semibold mb-2">Special Requests</h3>
                      <p className="text-muted-foreground bg-muted/50 p-3 rounded-md">{selectedOrder.comments}</p>
                    </div>
                  )}

                  {selectedOrder.drinkRecipe && (
                    <div>
                      <h3 className="font-semibold mb-2">Recipe & Instructions</h3>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedOrder.drinkRecipe}</p>
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
