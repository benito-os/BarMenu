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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { addTrackedOrder } from "@/lib/orderCookies";
import { OrderStatusBanner } from "@/components/OrderStatusBanner";
import type { Menu, DrinkAvailability } from "@shared/validation";
import { Home, Wine, Sparkles, Glasses, Check, Flame, Snowflake, ThermometerSun, Share2, QrCode } from "lucide-react";
import { useState } from "react";
import { BrandedQRCode } from "@/components/BrandedQRCode";

export default function MenuDetail() {
  const [, params] = useRoute("/menu/:slug");
  const slug = params?.slug;
  const { toast } = useToast();
  const [orderedDrinks, setOrderedDrinks] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDrinkId, setSelectedDrinkId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [comments, setComments] = useState("");
  const [asMocktail, setAsMocktail] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  const { data: menu, isLoading: menuLoading } = useQuery<Menu>({
    queryKey: ["/api/menus", slug],
    enabled: !!slug,
  });

  const { data: drinks, isLoading: drinksLoading } = useQuery<DrinkAvailability[]>({
    queryKey: [`/api/drinks?menuId=${menu?.id}`],
    enabled: !!menu?.id,
  });

  const orderMutation = useMutation({
    mutationFn: async ({ 
      drinkId, 
      guestName, 
      comments, 
      asMocktail 
    }: { 
      drinkId: string; 
      guestName?: string; 
      comments?: string; 
      asMocktail?: boolean;
    }) => {
      const response = await apiRequest("POST", "/api/orders", {
        drinkId,
        menuId: menu?.id,
        guestName: guestName || undefined,
        comments: comments || undefined,
        asMocktail: asMocktail || false,
      });
      return response.json();
    },
    onSuccess: (data: any, { drinkId, guestName }) => {
      const drink = drinks?.find(d => d.id === drinkId);
      
      // Track order in cookies for status checking
      if (data && data.id) {
        addTrackedOrder({
          orderId: data.id,
          drinkName: drink?.name || "Unknown Drink",
          guestName: guestName,
          timestamp: Date.now(),
        });
      }
      
      // Update state in a batch to prevent race conditions
      setOrderedDrinks(prev => new Set(prev).add(drinkId));
      
      // Use setTimeout to ensure dialog closes after state updates
      setTimeout(() => {
        setDialogOpen(false);
        setGuestName("");
        setComments("");
        setAsMocktail(false);
        setSelectedDrinkId(null);
        
        toast({
          title: "Order Placed!",
          description: `Your ${drink?.name} is in the queue`,
          duration: 3000,
        });
      }, 0);
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
      orderMutation.mutate({ 
        drinkId: selectedDrinkId, 
        guestName,
        comments,
        asMocktail,
      });
    }
  };

  // Group drinks by section
  const drinksBySection = drinks?.reduce((acc, drink) => {
    if (!acc[drink.section]) {
      acc[drink.section] = [];
    }
    acc[drink.section].push(drink);
    return acc;
  }, {} as Record<string, DrinkAvailability[]>) || {};

  // Use menu.sections order if available, then append any additional sections from drinks
  // This preserves admin-defined order while still showing any new sections that have drinks
  const allDrinkSections = Object.keys(drinksBySection);
  const sections = menu?.sections && menu.sections.length > 0
    ? [
        ...menu.sections.filter(section => drinksBySection[section]), // Admin-ordered sections with drinks
        ...allDrinkSections.filter(section => !menu.sections.includes(section)).sort() // Additional sections not in menu.sections
      ]
    : allDrinkSections.sort();

  const isLoading = menuLoading || drinksLoading;

  if (!slug) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Invalid menu</p>
      </div>
    );
  }

  // Dynamic theming styles
  const themingStyle = menu ? {
    backgroundColor: menu.backgroundColor || undefined,
    fontFamily: menu.typography || undefined,
  } : {};

  const accentColor = menu?.accentColor || undefined;
  const sectionHeaderColor = menu?.sectionHeaderColor || undefined;
  const menuTitleColor = menu?.menuTitleColor || undefined;
  
  // Card and badge theming
  const cardBackgroundColor = menu?.cardBackgroundColor || undefined;
  const cardBorderColor = menu?.cardBorderColor || undefined;
  const badgeBackgroundColor = menu?.badgeBackgroundColor || undefined;
  const badgeTextColor = menu?.badgeTextColor || undefined;
  const requestButtonBackgroundColor = menu?.requestButtonBackgroundColor || undefined;
  const requestButtonTextColor = menu?.requestButtonTextColor || undefined;
  const drinkTitleColor = menu?.drinkTitleColor || undefined;
  const drinkDescriptionColor = menu?.drinkDescriptionColor || undefined;
  
  // Build card style object
  const getCardStyle = () => {
    const style: React.CSSProperties = {};
    if (cardBackgroundColor) style.backgroundColor = cardBackgroundColor;
    if (cardBorderColor) style.borderColor = cardBorderColor;
    return style;
  };
  
  // Build badge style object
  const getBadgeStyle = () => {
    const style: React.CSSProperties = {};
    if (badgeBackgroundColor) style.backgroundColor = badgeBackgroundColor;
    if (badgeTextColor) style.color = badgeTextColor;
    return style;
  };
  
  // Build request button style object
  const getRequestButtonStyle = () => {
    const style: React.CSSProperties = {};
    if (requestButtonBackgroundColor) {
      style.backgroundColor = requestButtonBackgroundColor;
      style.borderColor = requestButtonBackgroundColor;
    }
    if (requestButtonTextColor) style.color = requestButtonTextColor;
    return style;
  };

  return (
    <div className="min-h-screen bg-background" style={themingStyle}>
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
              <h1 
                className="text-xl md:text-2xl font-bold text-foreground truncate flex-1 text-center"
                style={{ color: menuTitleColor }}
              >
                {menu.name}
              </h1>
            )}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setQrDialogOpen(true)}
              data-testid="button-share-menu"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Image Section */}
      {menu?.heroImageUrl && (
        <div 
          className="relative h-64 md:h-96 w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${menu.heroImageUrl})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/60 flex items-center justify-center">
            <div className="text-center text-white px-6">
              <h2 className="text-4xl md:text-6xl font-bold mb-4">
                {menu.name}
              </h2>
              {menu.description && (
                <p className="text-lg md:text-xl max-w-2xl mx-auto">
                  {menu.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Order Status Banner - Shows active orders inline */}
        <OrderStatusBanner />
        
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
            {/* Menu Header - only show if no hero image */}
            {!menu.heroImageUrl && (
              <div className="text-center space-y-4 pb-8 border-b">
                <h2 
                  className="text-4xl md:text-5xl font-bold text-foreground"
                  style={{ color: menuTitleColor }}
                >
                  {menu.name}
                </h2>
                {menu.description && (
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    {menu.description}
                  </p>
                )}
              </div>
            )}

            {/* Sections */}
            {sections.map((section) => (
              <section key={section} className="space-y-6">
                <h3 
                  className="text-xl md:text-2xl font-semibold uppercase tracking-wide border-l-4 pl-4"
                  style={{
                    borderLeftColor: accentColor || undefined,
                    color: sectionHeaderColor || undefined,
                    ...(accentColor ? {} : { borderLeftColor: 'hsl(var(--primary))' })
                  }}
                >
                  {section}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {drinksBySection[section]
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((drink) => {
                      const isOrdered = orderedDrinks.has(drink.id);
                      const isUnavailable = !drink.isMakeable || drink.isOutOfStock;
                      
                      return (
                        <Card 
                          key={drink.id} 
                          className="flex flex-col h-full hover-elevate"
                          style={getCardStyle()}
                          data-testid={`card-drink-${drink.id}`}
                        >
                          <CardHeader className="flex-1">
                            <CardTitle 
                              className="text-xl mb-2"
                              style={{ color: drinkTitleColor || undefined }}
                            >
                              {drink.name}
                            </CardTitle>
                            {drink.style && (
                              <Badge 
                                variant="secondary" 
                                className="w-fit mb-3"
                                style={getBadgeStyle()}
                              >
                                {drink.style}
                              </Badge>
                            )}
                            {drink.description && (
                              <CardDescription 
                                className="text-sm leading-relaxed"
                                style={{ color: drinkDescriptionColor || undefined }}
                              >
                                {drink.description}
                              </CardDescription>
                            )}
                            
                            {/* Badges row */}
                            <div className="flex flex-wrap gap-2 pt-3">
                              {drink.isOutOfStock && (
                                <Badge variant="destructive" className="text-xs">
                                  Out of stock
                                </Badge>
                              )}
                              {!drink.isOutOfStock && drink.missingIngredients.length > 0 && (
                                <Badge variant="secondary" className="text-xs" style={getBadgeStyle()}>
                                  Missing ingredients
                                </Badge>
                              )}
                              {drink.isMocktail && (
                                <Badge 
                                  variant="secondary" 
                                  className="text-xs"
                                  style={getBadgeStyle()}
                                >
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  Non-Alcoholic
                                </Badge>
                              )}
                              {drink.canBeMocktail && !drink.isMocktail && (
                                <Badge 
                                  variant="secondary" 
                                  className="text-xs"
                                  style={getBadgeStyle()}
                                >
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  Mocktail Available
                                </Badge>
                              )}
                              {drink.temperature === "hot" && (
                                <Badge variant="secondary" className="text-xs" style={getBadgeStyle()}>
                                  <Flame className="w-3 h-3 mr-1" />
                                  Hot
                                </Badge>
                              )}
                              {drink.temperature === "cold" && (
                                <Badge variant="secondary" className="text-xs" style={getBadgeStyle()}>
                                  <Snowflake className="w-3 h-3 mr-1" />
                                  Cold
                                </Badge>
                              )}
                              {drink.temperature === "room_temp" && (
                                <Badge variant="secondary" className="text-xs" style={getBadgeStyle()}>
                                  <ThermometerSun className="w-3 h-3 mr-1" />
                                  Room Temp
                                </Badge>
                              )}
                              {drink.isStirred && (
                                <Badge variant="secondary" className="text-xs" style={getBadgeStyle()}>
                                  <Wine className="w-3 h-3 mr-1" />
                                  Stirred
                                </Badge>
                              )}
                              {drink.isShaken && (
                                <Badge variant="secondary" className="text-xs" style={getBadgeStyle()}>
                                  <Glasses className="w-3 h-3 mr-1" />
                                  Shaken
                                </Badge>
                              )}
                              {drink.baseSpirit && (
                                <Badge variant="secondary" className="text-xs" style={getBadgeStyle()}>
                                  {drink.baseSpirit}
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          
                          <CardContent>
                            <Button
                              className="w-full"
                              onClick={() => handleOrderClick(drink.id)}
                              disabled={orderMutation.isPending || isOrdered || isUnavailable}
                              data-testid={`button-order-${drink.id}`}
                              style={!isOrdered && !isUnavailable ? getRequestButtonStyle() : undefined}
                            >
                              {isOrdered ? (
                                <>
                                  <Check className="w-4 h-4 mr-2" />
                                  Ordered
                                </>
                              ) : isUnavailable ? (
                                "Unavailable"
                              ) : (
                                "Request This Drink"
                              )}
                            </Button>
                            {drink.missingIngredients.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Missing: {drink.missingIngredients.join(", ")}
                              </p>
                            )}
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
        <DialogContent data-testid="dialog-guest-name" className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Your Order</DialogTitle>
            <DialogDescription>
              Add your details and any special requests for this drink
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="guest-name">Your Name (Optional)</Label>
              <Input
                id="guest-name"
                data-testid="input-guest-name"
                placeholder="e.g., Alex"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
              />
            </div>

            {/* Show mocktail checkbox only if drink can be made as mocktail */}
            {selectedDrinkId && drinks?.find(d => d.id === selectedDrinkId)?.canBeMocktail && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="as-mocktail"
                  data-testid="checkbox-as-mocktail"
                  checked={asMocktail}
                  onCheckedChange={(checked) => setAsMocktail(checked as boolean)}
                />
                <Label 
                  htmlFor="as-mocktail" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Make this as a mocktail (non-alcoholic)</span>
                  </div>
                </Label>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="comments">Special Requests (Optional)</Label>
              <Textarea
                id="comments"
                data-testid="textarea-comments"
                placeholder="e.g., Extra ice, no garnish, make it sweeter..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setGuestName("");
                setComments("");
                setAsMocktail(false);
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

      {/* Share QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent data-testid="dialog-share-qr" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Share {menu?.name}
            </DialogTitle>
            <DialogDescription>
              Scan to view this menu or share the link with friends
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {menu && (
              <BrandedQRCode
                url={window.location.href}
                menuName={menu.name}
                slug={menu.slug}
                size={200}
                fgColor={menu.accentColor || "#1a1a1a"}
                bgColor="#ffffff"
                showActions={true}
                showDownload={true}
                showShare={true}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
