import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useOrders } from "@/hooks/useOrders";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Clock, CheckCircle2, AlertCircle } from "lucide-react";
import type { OrderWithDrink } from "@shared/validation";

export default function QueuePage() {
  const { queue, queueLoading, markInProgress, markServed, inProgressPending, servedPending } = useOrders(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDrink | null>(null);

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
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-full">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Live Order Queue</CardTitle>
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
                                markInProgress(order.id);
                              }}
                              disabled={inProgressPending}
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
                                markServed(order.id);
                              }}
                              disabled={servedPending}
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
