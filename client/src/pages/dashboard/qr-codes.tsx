import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useMenus } from "@/hooks/useMenus";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { QRCodeSVG } from "qrcode.react";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function QRCodesPage() {
  const { menus, menusLoading, defaultMenu } = useMenus();
  const { toast } = useToast();
  const qrRef = useRef<HTMLDivElement>(null);

  // QR Code customization state
  const [selectedMenuId, setSelectedMenuId] = useState<string>("HOME");
  const [qrSize, setQrSize] = useState<number>(256);
  const [qrFgColor, setQrFgColor] = useState<string>("#000000");
  const [qrBgColor, setQrBgColor] = useState<string>("#ffffff");
  const [qrLevel, setQrLevel] = useState<"L" | "M" | "Q" | "H">("H");
  const [qrIncludeMargin, setQrIncludeMargin] = useState<boolean>(true);

  // Get base URL for QR codes
  const baseUrl = window.location.origin;

  // Set default menu when menus load
  useEffect(() => {
    if (selectedMenuId === "HOME" && defaultMenu) {
      setSelectedMenuId(defaultMenu.id);
    }
  }, [defaultMenu, selectedMenuId]);

  // Get selected menu
  const selectedMenu = menus.find(menu => menu.id === selectedMenuId);

  // Generate QR code URL
  const qrCodeUrl = selectedMenu ? `${baseUrl}/menu/${selectedMenu.slug}` : baseUrl;

  // Download QR code as PNG
  const downloadQRCode = () => {
    if (!qrRef.current) return;

    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    try {
      // Create a canvas element
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Set canvas size
      canvas.width = qrSize;
      canvas.height = qrSize;

      // Convert SVG to image
      const svgData = new XMLSerializer().serializeToString(svg);
      const img = new Image();
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);

        // Convert canvas to PNG and download
        canvas.toBlob((blob) => {
          if (!blob) return;
          
          const downloadUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = downloadUrl;
          link.download = selectedMenu 
            ? `qr-code-${selectedMenu.slug}.png`
            : "qr-code-home.png";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(downloadUrl);

          toast({
            title: "QR Code Downloaded",
            description: "Your QR code has been saved as a PNG file",
          });
        });
      };

      img.src = url;
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download QR code. Please try again.",
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
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2" data-testid="text-page-title">
            QR Code Generator
          </h2>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Generate QR codes for your menus that guests can scan to view drinks
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* QR Code Preview */}
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
                {/* Menu Selector */}
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
                      {menus.map((menu) => (
                        <SelectItem 
                          key={menu.id} 
                          value={menu.id}
                          data-testid={`select-menu-${menu.id}`}
                        >
                          {menu.name} {menu.isActive && "(Active)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* QR Code Display */}
                <div className="flex flex-col items-center gap-4 py-6">
                  <div 
                    ref={qrRef}
                    className="bg-white p-6 rounded-lg border" 
                    style={{ backgroundColor: qrBgColor }}
                    data-testid="container-qr-preview"
                  >
                    <QRCodeSVG
                      value={qrCodeUrl}
                      size={qrSize}
                      level={qrLevel}
                      includeMargin={qrIncludeMargin}
                      fgColor={qrFgColor}
                      bgColor={qrBgColor}
                    />
                  </div>

                  {/* URL Display */}
                  <div className="w-full space-y-2">
                    <Label className="text-sm font-medium">QR Code URL</Label>
                    <p className="text-sm text-muted-foreground break-all font-mono bg-muted p-3 rounded-md" data-testid="text-qr-url">
                      {qrCodeUrl}
                    </p>
                    <p className="text-xs text-muted-foreground" data-testid="text-qr-instructions">
                      {selectedMenu 
                        ? `Guests will be taken directly to the ${selectedMenu.name} menu`
                        : "Guests will see all active menus on the home page"}
                    </p>
                  </div>

                  {/* Download Button */}
                  <Button 
                    onClick={downloadQRCode}
                    className="w-full"
                    data-testid="button-download-qr"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download QR Code
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* QR Code Customization */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Customization</CardTitle>
              <CardDescription>
                Customize the appearance of your QR code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Size Slider */}
              <div className="space-y-2">
                <Label htmlFor="qr-size">Size: {qrSize}px</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="qr-size"
                    type="range"
                    min="100"
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

              {/* Color Pickers */}
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
                      data-testid="input-qr-fg-color"
                    />
                    <Input
                      type="text"
                      value={qrFgColor}
                      onChange={(e) => setQrFgColor(e.target.value)}
                      placeholder="#000000"
                      className="flex-1 font-mono"
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
                      onChange={(e) => setQrBgColor(e.target.value)}
                      className="h-10 w-20"
                      data-testid="input-qr-bg-color"
                    />
                    <Input
                      type="text"
                      value={qrBgColor}
                      onChange={(e) => setQrBgColor(e.target.value)}
                      placeholder="#ffffff"
                      className="flex-1 font-mono"
                      data-testid="input-qr-bg-color-text"
                    />
                  </div>
                </div>
              </div>

              {/* Error Correction Level */}
              <div className="space-y-2">
                <Label htmlFor="qr-level">Error Correction Level</Label>
                <Select 
                  value={qrLevel} 
                  onValueChange={(value: "L" | "M" | "Q" | "H") => setQrLevel(value)}
                >
                  <SelectTrigger id="qr-level" data-testid="select-qr-level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L" data-testid="select-level-l">Low (7% recovery)</SelectItem>
                    <SelectItem value="M" data-testid="select-level-m">Medium (15% recovery)</SelectItem>
                    <SelectItem value="Q" data-testid="select-level-q">Quartile (25% recovery)</SelectItem>
                    <SelectItem value="H" data-testid="select-level-h">High (30% recovery)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground" data-testid="text-level-description">
                  Higher levels allow the QR code to be read even if partially damaged or obscured
                </p>
              </div>

              {/* Include Margin */}
              <div className="flex items-center gap-2">
                <Switch
                  id="qr-margin"
                  checked={qrIncludeMargin}
                  onCheckedChange={setQrIncludeMargin}
                  data-testid="switch-qr-margin"
                />
                <Label htmlFor="qr-margin" className="text-sm">
                  Include quiet zone margin
                </Label>
              </div>

              {/* Quick Presets */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-2">Quick Presets</h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQrFgColor("#000000");
                      setQrBgColor("#ffffff");
                      setQrSize(256);
                    }}
                    data-testid="button-preset-classic"
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
                    data-testid="button-preset-elegant"
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
                    data-testid="button-preset-purple"
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
                    data-testid="button-preset-red"
                  >
                    Red
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
