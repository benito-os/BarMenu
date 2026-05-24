import { useMemo, useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useMenus } from "@/hooks/useMenus";
import { useSettings } from "@/hooks/useSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { BrandedQRCode } from "@/components/BrandedQRCode";
import { QRPrintSheet } from "@/components/QRPrintSheet";
import { Copy, Palette, Printer, FlaskConical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { DrinkAvailability } from "@shared/validation";

export default function QRCodesPage() {
  const { menus, menusLoading, defaultMenu } = useMenus();
  const { settings } = useSettings();
  const { toast } = useToast();

  const [selectedMenuId, setSelectedMenuId] = useState<string>("");
  const [qrSize, setQrSize] = useState<number>(256);
  const [qrFgColor, setQrFgColor] = useState<string>("#1a1a1a");
  const [qrBgColor, setQrBgColor] = useState<string>("#ffffff");
  const [useMenuColors, setUseMenuColors] = useState<boolean>(true);
  const [showArchived, setShowArchived] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  // Hide inactive menus from the picker by default. Keep the currently
  // selected one visible so it doesn't disappear mid-edit.
  const visibleMenus = useMemo(
    () => menus.filter((m) => showArchived || m.isActive || m.id === selectedMenuId),
    [menus, showArchived, selectedMenuId],
  );
  const archivedCount = menus.filter((m) => !m.isActive).length;
  const activeMenuCount = menus.filter((m) => m.isActive).length;

  // "Place test order" — sanity-checks the guest flow end-to-end without
  // needing to scan a QR with a phone. Fetches the selected menu's drinks,
  // grabs the first one that's active + in stock, posts an order with a
  // visible Test label, then invalidates the queue cache so it shows up.
  const testOrderMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMenuId || selectedMenuId === "HOME") {
        throw new Error("Pick a menu first");
      }
      const drinksRes = await apiRequest("GET", `/api/drinks?menuId=${selectedMenuId}`);
      const drinks: DrinkAvailability[] = await drinksRes.json();
      const candidate = drinks.find(
        (d) => d.isActive && !d.isOutOfStock && d.isMakeable,
      );
      if (!candidate) {
        throw new Error("No active in-stock drinks on this menu");
      }
      const res = await apiRequest("POST", "/api/orders", {
        drinkId: candidate.id,
        menuId: selectedMenuId,
        guestName: "🧪 Test Order",
        comments: "Placed from QR Codes page — safe to cancel",
        asMocktail: false,
      });
      const order = await res.json();
      return { order, drinkName: candidate.name };
    },
    onSuccess: ({ drinkName }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/queue"] });
      toast({
        title: "Test order placed",
        description: `Ordered "${drinkName}". Check the Queue page.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Test order failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const baseUrl = window.location.origin;

  // Seed with the active menu once menus load (without overriding a user choice).
  useEffect(() => {
    if (!selectedMenuId && defaultMenu) {
      setSelectedMenuId(defaultMenu.id);
    }
  }, [defaultMenu, selectedMenuId]);

  const selectedMenu = menus.find(menu => menu.id === selectedMenuId);

  useEffect(() => {
    if (useMenuColors && selectedMenu) {
      if (selectedMenu.accentColor) {
        setQrFgColor(selectedMenu.accentColor);
      } else {
        setQrFgColor("#1a1a1a");
      }
      if (selectedMenu.backgroundColor) {
        setQrBgColor(selectedMenu.backgroundColor);
      } else {
        setQrBgColor("#ffffff");
      }
    }
  }, [selectedMenu, useMenuColors]);

  const qrCodeUrl = selectedMenu ? `${baseUrl}/menu/${selectedMenu.slug}` : baseUrl;

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(qrCodeUrl);
      toast({
        title: "Link Copied",
        description: "Menu URL copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        variant: "destructive",
      });
    }
  };

  if (menusLoading) {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-6 max-w-full">
          <div className="mb-6">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-full">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold mb-2" data-testid="text-page-title">
              Branded QR Codes
            </h2>
            <p className="text-muted-foreground" data-testid="text-page-description">
              Generate branded QR codes with your Bar Flores logo for guests to scan
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => testOrderMutation.mutate()}
              disabled={
                testOrderMutation.isPending ||
                !selectedMenuId ||
                selectedMenuId === "HOME"
              }
              data-testid="button-test-order"
              title={
                selectedMenuId && selectedMenuId !== "HOME"
                  ? "Place a test order on this menu"
                  : "Pick a menu first"
              }
            >
              <FlaskConical className="w-4 h-4 mr-2" />
              {testOrderMutation.isPending ? "Placing..." : "Place test order"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPrintOpen(true)}
              disabled={activeMenuCount === 0}
              data-testid="button-open-print"
              title={
                activeMenuCount > 0
                  ? `Print QR codes for ${activeMenuCount} active menu${activeMenuCount === 1 ? "" : "s"}`
                  : "No active menus to print"
              }
            >
              <Printer className="w-4 h-4 mr-2" />
              Print sheet
            </Button>
          </div>
        </div>

        <QRPrintSheet
          open={printOpen}
          onOpenChange={setPrintOpen}
          menus={menus}
          baseUrl={baseUrl}
          settings={settings}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">QR Code Preview</CardTitle>
              <CardDescription>
                {selectedMenu 
                  ? `Scan to view ${selectedMenu.name}`
                  : "Select a menu to generate a QR code"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="menu-select">Select Menu</Label>
                  <Select
                    value={selectedMenuId}
                    onValueChange={setSelectedMenuId}
                  >
                    <SelectTrigger id="menu-select" data-testid="select-menu">
                      <SelectValue placeholder="Choose a menu" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HOME" data-testid="select-menu-home">
                        Home Page (All Menus)
                      </SelectItem>
                      {visibleMenus.map((menu) => (
                        <SelectItem
                          key={menu.id}
                          value={menu.id}
                          data-testid={`select-menu-${menu.id}`}
                        >
                          {menu.name}
                          {!menu.isActive && " (archived)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {archivedCount > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      <Checkbox
                        id="qr-show-archived"
                        checked={showArchived}
                        onCheckedChange={(c) => setShowArchived(c === true)}
                        data-testid="checkbox-qr-show-archived"
                      />
                      <Label htmlFor="qr-show-archived" className="text-xs text-muted-foreground cursor-pointer">
                        Show archived menus ({archivedCount})
                      </Label>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center gap-4 py-6">
                  <BrandedQRCode
                    url={qrCodeUrl}
                    menuName={selectedMenu?.name || "Bar Flores"}
                    slug={selectedMenu?.slug || "home"}
                    size={qrSize}
                    fgColor={qrFgColor}
                    bgColor={qrBgColor}
                    showActions={true}
                    showDownload={true}
                    showShare={true}
                    customLogoUrl={settings.brandingLogoUrl}
                    dotStyle={settings.qrDotStyle as "dots" | "squares"}
                    eyeStyle={settings.qrEyeStyle as "rounded" | "square"}
                  />

                  <div className="w-full space-y-2">
                    <Label className="text-sm font-medium">QR Code URL</Label>
                    <div className="flex gap-2">
                      <p className="flex-1 text-sm text-muted-foreground break-all font-mono bg-muted p-3 rounded-md" data-testid="text-qr-url">
                        {qrCodeUrl}
                      </p>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={copyUrl}
                        data-testid="button-copy-url"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground" data-testid="text-qr-instructions">
                      {selectedMenu 
                        ? `Guests will be taken directly to the ${selectedMenu.name} menu`
                        : "Guests will see all active menus on the home page"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Customization</CardTitle>
              <CardDescription>
                Customize the appearance of your branded QR code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Palette className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <Label htmlFor="use-menu-colors" className="text-sm font-medium">
                    Use Menu Theme Colors
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically match QR code colors to your menu's accent and background colors
                  </p>
                </div>
                <Switch
                  id="use-menu-colors"
                  checked={useMenuColors}
                  onCheckedChange={setUseMenuColors}
                  data-testid="switch-use-menu-colors"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="qr-size">Size: {qrSize}px</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="qr-size"
                    type="range"
                    min="150"
                    max="400"
                    step="16"
                    value={qrSize}
                    onChange={(e) => setQrSize(parseInt(e.target.value))}
                    className="flex-1"
                    data-testid="input-qr-size"
                  />
                  <span className="text-sm text-muted-foreground min-w-[60px]" data-testid="text-qr-size">
                    {qrSize}px
                  </span>
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
                      onChange={(e) => {
                        setQrFgColor(e.target.value);
                        setUseMenuColors(false);
                      }}
                      className="h-10 w-20"
                      data-testid="input-qr-fg-color"
                    />
                    <Input
                      type="text"
                      value={qrFgColor}
                      onChange={(e) => {
                        setQrFgColor(e.target.value);
                        setUseMenuColors(false);
                      }}
                      placeholder="#000000"
                      className="flex-1 font-mono text-sm"
                      data-testid="input-qr-fg-color-text"
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
                      onChange={(e) => {
                        setQrBgColor(e.target.value);
                        setUseMenuColors(false);
                      }}
                      className="h-10 w-20"
                      data-testid="input-qr-bg-color"
                    />
                    <Input
                      type="text"
                      value={qrBgColor}
                      onChange={(e) => {
                        setQrBgColor(e.target.value);
                        setUseMenuColors(false);
                      }}
                      placeholder="#ffffff"
                      className="flex-1 font-mono text-sm"
                      data-testid="input-qr-bg-color-text"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-3">Quick Presets</h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQrFgColor("#1a1a1a");
                      setQrBgColor("#ffffff");
                      setUseMenuColors(false);
                    }}
                    data-testid="button-preset-classic"
                  >
                    Classic
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQrFgColor("#78350f");
                      setQrBgColor("#fef3c7");
                      setUseMenuColors(false);
                    }}
                    data-testid="button-preset-warm"
                  >
                    Warm Gold
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQrFgColor("#1e3a5f");
                      setQrBgColor("#f0f9ff");
                      setUseMenuColors(false);
                    }}
                    data-testid="button-preset-navy"
                  >
                    Navy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQrFgColor("#7c3aed");
                      setQrBgColor("#faf5ff");
                      setUseMenuColors(false);
                    }}
                    data-testid="button-preset-purple"
                  >
                    Purple
                  </Button>
                  {selectedMenu?.accentColor && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUseMenuColors(true)}
                      data-testid="button-preset-menu"
                    >
                      Menu Theme
                    </Button>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-2">About Branded QR Codes</h3>
                <p className="text-xs text-muted-foreground">
                  Your QR codes feature the Bar Flores "BF" logo in the center with rounded 
                  corner styling and dot patterns. The high error correction level ensures 
                  the code remains scannable even with the logo overlay.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
