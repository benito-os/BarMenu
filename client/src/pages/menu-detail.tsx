import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, HttpError } from "@/lib/queryClient";
import { addTrackedOrder } from "@/lib/orderCookies";
import { OrderStatusBanner } from "@/components/OrderStatusBanner";
import type { Menu, DrinkAvailability } from "@shared/validation";
import { Home, Sparkles, Check, Share2, QrCode, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { ensureFontLoaded } from "@/hooks/useApplyBrandSettings";
import { BrandedQRCode } from "@/components/BrandedQRCode";
import { DecoRule, SectionHeading } from "@/components/brand/Deco";
import { cn } from "@/lib/utils";

/**
 * Pull the guest-readable message out of an API failure. The server answers
 * 4xx with `{ error: "..." }` (rate limit, out of stock, inactive drink) and
 * apiRequest surfaces the raw body as the error message. Anything we cannot
 * parse falls back to the generic copy.
 */
function orderErrorMessage(error: unknown): string {
  const fallback = "Couldn't place the order. Please try again.";
  if (!(error instanceof Error) || !error.message) return fallback;
  try {
    const parsed = JSON.parse(error.message) as { error?: unknown };
    if (typeof parsed.error === "string" && parsed.error.trim()) {
      return parsed.error;
    }
  } catch {
    // Not JSON; fall through.
  }
  return fallback;
}

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

  // One request for the menu and its drinks. Short staleTime plus refetch on
  // focus so a guest who reopens their phone sees a drink that was 86'd
  // meanwhile (the global default is Infinity / no refetch on focus).
  const {
    data: menuData,
    isLoading,
    isError: menuError,
    error: menuErrorObj,
    refetch: refetchMenu,
  } = useQuery<{ menu: Menu; drinks: DrinkAvailability[] }>({
    queryKey: ["/api/menus", slug, "full"],
    enabled: !!slug,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
  const menu = menuData?.menu;
  const drinks = menuData?.drinks;

  // Only the two default font families ship in index.html; a menu themed
  // with another preset has to ask for its stylesheet.
  const menuTypography = menu?.typography;
  useEffect(() => {
    ensureFontLoaded(menuTypography);
  }, [menuTypography]);

  // A 404 is a real "menu not found"; anything else (network, 5xx) is a
  // load failure the guest can retry. Keep the two apart so bar wifi
  // dropping out never reads as "this menu does not exist".
  const menuMissing =
    menuError && menuErrorObj instanceof HttpError && menuErrorObj.status === 404;
  const loadFailed = menuError && !menuMissing;

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
    onError: (error) => {
      toast({
        title: "Order not placed",
        description: orderErrorMessage(error),
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

  if (!slug) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Invalid menu</p>
      </div>
    );
  }

  // Dynamic theming. The printed-menu theme supplies the defaults; anything
  // the owner set on this menu wins. Per-menu typography replaces both the
  // headline and body font slots for this page, so every font-headline /
  // font-body element below follows it; otherwise the global brand fonts
  // (useApplyBrandSettings) apply.
  const themingStyle = (menu
    ? {
        backgroundColor: menu.backgroundColor || undefined,
        ...(menu.typography
          ? {
              fontFamily: menu.typography,
              "--font-headline": menu.typography,
              "--font-body": menu.typography,
            }
          : {}),
      }
    : {}) as React.CSSProperties;

  const accentColor = menu?.accentColor || undefined;
  const sectionHeaderColor = menu?.sectionHeaderColor || undefined;
  const menuTitleColor = menu?.menuTitleColor || undefined;
  // Accent recolours the brass parts (rules, ornaments, tag line). Without
  // one, the theme's brass tokens apply.
  const accentText = accentColor ? { color: accentColor } : undefined;
  const accentRule = accentColor ? { backgroundColor: accentColor } : undefined;

  return (
    <div className="min-h-screen bg-background font-body" style={themingStyle}>
      {/* Fixed Header. Takes the menu's own background when it has one, so a
          themed menu never gets a cream band across the top. */}
      <header
        className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 border-b border-brass/30"
        style={menu?.backgroundColor ? { backgroundColor: menu.backgroundColor } : undefined}
      >
        <div className="max-w-5xl mx-auto px-2 sm:px-6 py-1.5">
          <div className="flex items-center justify-between gap-2">
            <Link href="/">
              <Button 
                variant="ghost" 
                size="sm"
                className="min-h-11 px-3"
                data-testid="button-back-home"
              >
                <Home className="w-4 h-4 mr-1.5" />
                Home
              </Button>
            </Link>
            {menu && (
              <h1 
                className="font-headline text-lg md:text-xl font-semibold text-foreground truncate flex-1 text-center"
                style={{ color: menuTitleColor }}
              >
                {menu.name}
              </h1>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="min-h-11 px-3"
              onClick={() => setQrDialogOpen(true)}
              aria-label={menu ? `Share ${menu.name}` : "Share this menu"}
              data-testid="button-share-menu"
            >
              <Share2 className="w-4 h-4 mr-1.5" />
              Share
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Image Section */}
      {menu?.heroImageUrl && (
        <div className="relative h-64 md:h-96 w-full overflow-hidden">
          <img
            src={menu.heroImageUrl}
            alt={menu.name}
            className="absolute inset-0 w-full h-full object-cover"
            decoding="async"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/45 to-ink/75 flex items-center justify-center">
            <div className="text-center text-paper px-6">
              <h2 className="font-headline text-4xl md:text-6xl font-bold">
                {menu.name}
              </h2>
              <DecoRule double className="mx-auto mt-4 mb-4 max-w-[14rem] text-gold" />
              {menu.description && (
                <p className="font-headline italic text-lg md:text-xl max-w-2xl mx-auto text-paper/90">
                  {menu.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-5 sm:px-8 pt-8 pb-16 md:pt-12">
        {/* Order Status Banner - Shows active orders inline */}
        <OrderStatusBanner />
        
        {loadFailed ? (
          <div className="text-center py-16 space-y-4" role="alert" data-testid="menu-load-error">
            <p className="text-lg font-medium text-foreground">Couldn't load the menu</p>
            <p className="text-muted-foreground">
              Check your connection and try again.
            </p>
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => {
                refetchMenu();
              }}
              data-testid="button-retry-menu"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try again
            </Button>
          </div>
        ) : isLoading ? (
          <div className="space-y-10">
            <div className="text-center space-y-4">
              <Skeleton className="h-12 w-3/4 mx-auto" />
              <Skeleton className="h-5 w-1/2 mx-auto" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-12 menu-rows md:[&>*:nth-child(2)]:border-t-0">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex gap-4 py-5">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-6 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                  <Skeleton className="h-11 w-24" />
                </div>
              ))}
            </div>
          </div>
        ) : menu ? (
          <div className="space-y-12">
            {/* Menu masthead - only show if no hero image */}
            {!menu.heroImageUrl && (
              <div className="text-center pt-2">
                {menu.isActive && (
                  <p className="smallcaps mb-4 text-brass" style={accentText}>
                    Tonight&rsquo;s menu
                  </p>
                )}
                <h2 
                  className="font-headline text-[2.75rem] leading-[1.02] md:text-6xl font-bold tracking-tight text-foreground"
                  style={{ color: menuTitleColor }}
                >
                  {menu.name}
                </h2>
                <DecoRule double className="mx-auto mt-5 max-w-[15rem]" style={accentText} />
                {menu.description && (
                  <p className="font-headline italic text-lg md:text-xl leading-snug text-muted-foreground max-w-xl mx-auto mt-5">
                    {menu.description}
                  </p>
                )}
              </div>
            )}

            {/* Sections: each one a ruled list of entries, like a printed
                menu card. Two columns from md up. */}
            {sections.map((section) => (
              <section key={section} className="space-y-1">
                <SectionHeading
                  as="h3"
                  align="center"
                  className="mb-2"
                  labelClassName="text-[0.8125rem] tracking-[0.22em]"
                  style={{ color: sectionHeaderColor || accentColor }}
                  ruleStyle={accentRule}
                >
                  {section}
                </SectionHeading>
                
                <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-12 menu-rows md:[&>*:nth-child(2)]:border-t-0">
                  {drinksBySection[section]
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((drink) => {
                      const isOrdered = orderedDrinks.has(drink.id);
                      const isUnavailable = !drink.isMakeable || drink.isOutOfStock;
                      // One quiet line of descriptors in small caps, instead
                      // of a row of boxed badges.
                      const descriptors = [
                        drink.style,
                        drink.temperature === "hot" ? "Hot" : drink.temperature === "cold" ? "Cold" : drink.temperature === "room_temp" ? "Room temp" : null,
                        drink.isStirred ? "Stirred" : null,
                        drink.isShaken ? "Shaken" : null,
                        drink.baseSpirit,
                      ].filter(Boolean) as string[];
                      
                      return (
                        <article 
                          key={drink.id} 
                          className="py-5"
                          data-testid={`card-drink-${drink.id}`}
                        >
                          <div className="flex items-start gap-4">
                            <div className="min-w-0 flex-1 pt-1">
                              <h4 className="font-headline text-[1.375rem] font-semibold leading-tight text-foreground">
                                {drink.name}
                              </h4>
                              {descriptors.length > 0 && (
                                <p className="mt-1.5 flex flex-wrap text-[0.6875rem] font-semibold uppercase tracking-[0.14em] leading-relaxed text-brass" style={accentText}>
                                  {descriptors.map((d, i) => (
                                    <span key={d + i} className="whitespace-nowrap">
                                      {d}
                                      {i < descriptors.length - 1 && <span aria-hidden className="mx-1.5 opacity-60">&middot;</span>}
                                    </span>
                                  ))}
                                </p>
                              )}
                            </div>
                            {/* min-h-11 = 44px: the one action a guest takes
                                on this page, so it gets a full thumb target. */}
                            <Button
                              variant="outline"
                              className={cn(
                                "shrink-0 min-h-11 min-w-[6.5rem] px-4 text-[0.9375rem] font-semibold",
                                "border-foreground/80 text-foreground hover:bg-foreground hover:text-background",
                                isOrdered && "border-success/60 bg-success-soft text-success-soft-foreground disabled:opacity-100",
                                isUnavailable && !isOrdered && "border-transparent px-0 min-w-0 text-xs uppercase tracking-[0.14em] text-muted-foreground disabled:opacity-100",
                              )}
                              onClick={() => handleOrderClick(drink.id)}
                              disabled={orderMutation.isPending || isOrdered || isUnavailable}
                              aria-label={
                                isOrdered
                                  ? `${drink.name} ordered`
                                  : isUnavailable
                                    ? `${drink.name} unavailable`
                                    : `Request ${drink.name}`
                              }
                              data-testid={`button-order-${drink.id}`}
                            >
                              {isOrdered ? (
                                <>
                                  <Check className="w-4 h-4" />
                                  Ordered
                                </>
                              ) : isUnavailable ? (
                                "Unavailable"
                              ) : (
                                "Request"
                              )}
                            </Button>
                          </div>
                          <div>
                            {drink.description && (
                              <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-foreground/75">
                                {drink.description}
                              </p>
                            )}
                            
                            {/* Status flags: only the ones a guest must notice. */}
                            {(drink.isOutOfStock || drink.missingIngredients.length > 0 || drink.isMocktail || (drink.canBeMocktail && !drink.isMocktail)) && (
                              <div className="flex flex-wrap gap-1.5 pt-2.5">
                                {drink.isOutOfStock && (
                                  <Badge variant="danger" className="text-xs">
                                    Out of stock
                                  </Badge>
                                )}
                                {!drink.isOutOfStock && drink.missingIngredients.length > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    Missing ingredients
                                  </Badge>
                                )}
                                {drink.isMocktail && (
                                  <Badge variant="success" className="text-xs">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    Non-Alcoholic
                                  </Badge>
                                )}
                                {drink.canBeMocktail && !drink.isMocktail && (
                                  <Badge variant="outline" className="text-xs">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    Mocktail Available
                                  </Badge>
                                )}
                              </div>
                            )}
                            {drink.missingIngredients.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Missing: {drink.missingIngredients.join(", ")}
                              </p>
                            )}
                          </div>
                        </article>
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
        <DialogContent data-testid="dialog-guest-name" className="max-w-md deco-corners">
          <DialogHeader className="text-left">
            {selectedDrinkId && (
              <p className="smallcaps text-brass">
                {drinks?.find(d => d.id === selectedDrinkId)?.name}
              </p>
            )}
            <DialogTitle className="text-2xl">Complete Your Order</DialogTitle>
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
                maxLength={80}
                autoComplete="given-name"
                enterKeyHint="next"
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
                maxLength={500}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="min-h-11"
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
              className="min-h-11"
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
