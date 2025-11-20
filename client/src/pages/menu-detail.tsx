import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Menu, Drink } from "@shared/schema";
import { Home, Wine, Sparkles, Glasses, Check } from "lucide-react";
import { useState } from "react";

export default function MenuDetail() {
  const [, params] = useRoute("/menu/:slug");
  const slug = params?.slug;
  const { toast } = useToast();
  const [orderedDrinks, setOrderedDrinks] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDrinkId, setSelectedDrinkId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");

  const { data: menu, isLoading: menuLoading } = useQuery<Menu>({
    queryKey: ["/api/menus", slug],
    enabled: !!slug,
  });

  const { data: drinks, isLoading: drinksLoading } = useQuery<Drink[]>({
    queryKey: [`/api/drinks?menuId=${menu?.id}`],
    enabled: !!menu?.id,
  });

  const orderMutation = useMutation({
    mutationFn: async ({ drinkId, guestName }: { drinkId: string; guestName?: string }) => {
      return apiRequest("POST", "/api/orders", {
        drinkId,
        menuId: menu?.id,
        guestName: guestName || undefined,
      });
    },
    onSuccess: (_, { drinkId }) => {
      const drink = drinks?.find(d => d.id === drinkId);
      setOrderedDrinks(prev => new Set(prev).add(drinkId));
      setDialogOpen(false);
      setGuestName("");
      setSelectedDrinkId(null);
      toast({
        title: "Order Placed!",
        description: `Your ${drink?.name} is in the queue`,
        duration: 3000,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to place order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleOrderClick = (drinkId: string) => {
    setSelectedDrinkId(drinkId);
    setDialogOpen(true);
  };

  const handleOrderSubmit = () => {
    if (selectedDrinkId) {
      orderMutation.mutate({ drinkId: selectedDrinkId, guestName });
    }
  };

  // Group drinks by section
  const drinksBySection = drinks?.reduce((acc, drink) => {
    if (!acc[drink.section]) {
      acc[drink.section] = [];
    }
    acc[drink.section].push(drink);
    return acc;
  }, {} as Record<string, Drink[]>) || {};

  const sections = Object.keys(drinksBySection).sort();

  const isLoading = menuLoading || drinksLoading;

  if (!slug) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Invalid menu</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <Link href="/">
              <Button 
                variant="ghost" 
                size="sm"
                data-testid="button-back-home"
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </Link>
            {menu && (
              <h1 className="font-serif text-xl md:text-2xl font-bold text-foreground truncate">
                {menu.name}
              </h1>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {isLoading ? (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <Skeleton className="h-12 w-3/4 mx-auto" />
              <Skeleton className="h-6 w-1/2 mx-auto" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : menu ? (
          <div className="space-y-12">
            {/* Menu Header */}
            <div className="text-center space-y-4 pb-8 border-b">
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground">
                {menu.name}
              </h2>
              {menu.description && (
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  {menu.description}
                </p>
              )}
            </div>

            {/* Sections */}
            {sections.map((section) => (
              <section key={section} className="space-y-6">
                <h3 className="font-sans text-xl md:text-2xl font-semibold text-foreground uppercase tracking-wide border-l-4 border-primary pl-4">
                  {section}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {drinksBySection[section]
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((drink) => {
                      const isOrdered = orderedDrinks.has(drink.id);
                      
                      return (
                        <Card 
                          key={drink.id} 
                          className="flex flex-col h-full hover-elevate"
                          data-testid={`card-drink-${drink.id}`}
                        >
                          <CardHeader className="flex-1">
                            <CardTitle className="font-serif text-xl text-foreground mb-2">
                              {drink.name}
                            </CardTitle>
                            {drink.style && (
                              <Badge variant="secondary" className="w-fit mb-3">
                                {drink.style}
                              </Badge>
                            )}
                            {drink.description && (
                              <CardDescription className="text-sm leading-relaxed">
                                {drink.description}
                              </CardDescription>
                            )}
                            
                            {/* Badges row */}
                            <div className="flex flex-wrap gap-2 pt-3">
                              {drink.isMocktail && (
                                <Badge variant="outline" className="text-xs">
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  Mocktail
                                </Badge>
                              )}
                              {drink.isStirred && (
                                <Badge variant="outline" className="text-xs">
                                  <Wine className="w-3 h-3 mr-1" />
                                  Stirred
                                </Badge>
                              )}
                              {drink.isShaken && (
                                <Badge variant="outline" className="text-xs">
                                  <Glasses className="w-3 h-3 mr-1" />
                                  Shaken
                                </Badge>
                              )}
                              {drink.baseSpirit && (
                                <Badge variant="outline" className="text-xs">
                                  {drink.baseSpirit}
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          
                          <CardContent>
                            <Button
                              className="w-full"
                              onClick={() => handleOrderClick(drink.id)}
                              disabled={orderMutation.isPending || isOrdered}
                              data-testid={`button-order-${drink.id}`}
                            >
                              {isOrdered ? (
                                <>
                                  <Check className="w-4 h-4 mr-2" />
                                  Ordered
                                </>
                              ) : (
                                "Request This Drink"
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              </section>
            ))}

            {sections.length === 0 && (
              <div className="text-center py-16">
                <p className="text-muted-foreground text-lg">
                  No drinks available on this menu yet.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">Menu not found</p>
            <Link href="/">
              <Button variant="outline" className="mt-4">
                <Home className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Guest Name Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-testid="dialog-guest-name">
          <DialogHeader>
            <DialogTitle>Who should we make this for?</DialogTitle>
            <DialogDescription>
              Optional: Enter your name so we know who ordered this drink
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="guest-name">Your Name</Label>
              <Input
                id="guest-name"
                data-testid="input-guest-name"
                placeholder="e.g., Alex"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleOrderSubmit();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setGuestName("");
                setSelectedDrinkId(null);
              }}
              data-testid="button-cancel-order"
            >
              Cancel
            </Button>
            <Button
              onClick={handleOrderSubmit}
              disabled={orderMutation.isPending}
              data-testid="button-confirm-order"
            >
              {orderMutation.isPending ? "Placing Order..." : "Place Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
