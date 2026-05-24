import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useSettings } from "@/hooks/useSettings";
import { useUpload } from "@/hooks/use-upload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, Save, Palette, Upload, Trash2, Type, QrCode, ShieldCheck } from "lucide-react";
import { FONT_PRESETS, QR_STYLES } from "@shared/schema";

export default function SettingsPage() {
  const { settings, settingsLoading, updateSettings, updateSettingsPending } = useSettings();
  const { uploadFile, isUploading } = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Queue settings state
  const [warningMinutes, setWarningMinutes] = useState(3);
  const [urgentMinutes, setUrgentMinutes] = useState(5);
  
  // Branding settings state
  const [brandingLogoUrl, setBrandingLogoUrl] = useState<string | null>(null);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [headlineFont, setHeadlineFont] = useState("playfair");
  const [bodyFont, setBodyFont] = useState("inter");
  const [qrDotStyle, setQrDotStyle] = useState("dots");
  const [qrEyeStyle, setQrEyeStyle] = useState("rounded");

  // Anti-spam state
  const [orderRateLimitPerHour, setOrderRateLimitPerHour] = useState(10);

  useEffect(() => {
    if (settings) {
      setWarningMinutes(settings.waitingWarningMinutes);
      setUrgentMinutes(settings.waitingUrgentMinutes);
      setBrandingLogoUrl(settings.brandingLogoUrl);
      setWelcomeMessage(settings.welcomeMessage || "");
      setHeadlineFont(settings.headlineFont || "playfair");
      setBodyFont(settings.bodyFont || "inter");
      setQrDotStyle(settings.qrDotStyle || "dots");
      setQrEyeStyle(settings.qrEyeStyle || "rounded");
      setOrderRateLimitPerHour(settings.orderRateLimitPerHour ?? 10);
    }
  }, [settings]);

  const handleSaveThresholds = () => {
    if (warningMinutes >= 1 && urgentMinutes >= 1 && urgentMinutes > warningMinutes) {
      updateSettings({
        waitingWarningMinutes: warningMinutes,
        waitingUrgentMinutes: urgentMinutes,
      });
    }
  };

  const hasChanges = 
    warningMinutes !== settings?.waitingWarningMinutes || 
    urgentMinutes !== settings?.waitingUrgentMinutes;

  const isValid = warningMinutes >= 1 && urgentMinutes >= 1 && urgentMinutes > warningMinutes;

  // Branding handlers
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const response = await uploadFile(file);
    if (response?.objectPath) {
      const logoUrl = response.objectPath;
      setBrandingLogoUrl(logoUrl);
      updateSettings({ brandingLogoUrl: logoUrl });
    }
  };

  const handleRemoveLogo = () => {
    setBrandingLogoUrl(null);
    updateSettings({ brandingLogoUrl: null });
  };

  const handleSaveBranding = () => {
    updateSettings({
      welcomeMessage: welcomeMessage || null,
      headlineFont,
      bodyFont,
      qrDotStyle,
      qrEyeStyle,
    });
  };

  const hasBrandingChanges =
    welcomeMessage !== (settings?.welcomeMessage || "") ||
    headlineFont !== (settings?.headlineFont || "playfair") ||
    bodyFont !== (settings?.bodyFont || "inter") ||
    qrDotStyle !== (settings?.qrDotStyle || "dots") ||
    qrEyeStyle !== (settings?.qrEyeStyle || "rounded");

  // Anti-spam handlers
  const handleSaveAntiSpam = () => {
    updateSettings({ orderRateLimitPerHour });
  };
  const hasAntiSpamChanges =
    orderRateLimitPerHour !== (settings?.orderRateLimitPerHour ?? 10);
  const antiSpamValid = orderRateLimitPerHour >= 0 && orderRateLimitPerHour <= 1000;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-full">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="text-3xl font-bold font-serif">Settings</h1>
            <p className="text-muted-foreground mt-2">
              Manage your account and application preferences
            </p>
          </div>

          {/* Queue Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Queue Settings
              </CardTitle>
              <CardDescription>
                Configure order queue waiting time thresholds
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="warningMinutes">Warning threshold (minutes)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="warningMinutes"
                        type="number"
                        min={1}
                        max={60}
                        value={warningMinutes}
                        onChange={(e) => setWarningMinutes(parseInt(e.target.value) || 1)}
                        disabled={settingsLoading}
                        data-testid="input-warning-minutes"
                        className="w-24"
                      />
                      {/* Mirrors the actual queue waiting-time badge style. */}
                      <Badge className="bg-warning text-warning-foreground hover:bg-warning">
                        Warning
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Orders waiting longer than this will show a yellow indicator
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="urgentMinutes">Urgent threshold (minutes)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="urgentMinutes"
                        type="number"
                        min={1}
                        max={60}
                        value={urgentMinutes}
                        onChange={(e) => setUrgentMinutes(parseInt(e.target.value) || 1)}
                        disabled={settingsLoading}
                        data-testid="input-urgent-minutes"
                        className="w-24"
                      />
                      {/* Matches variant="destructive" used for urgent on the queue. */}
                      <Badge variant="destructive">
                        Urgent
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Orders waiting longer than this will show a red urgent indicator
                    </p>
                  </div>
                </div>

                {!isValid && (
                  <p className="text-sm text-destructive">
                    Urgent threshold must be greater than warning threshold
                  </p>
                )}

                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveThresholds}
                    disabled={!hasChanges || !isValid || updateSettingsPending || settingsLoading}
                    data-testid="button-save-thresholds"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateSettingsPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Branding Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Branding
              </CardTitle>
              <CardDescription>
                Customize your logo, welcome message, and visual identity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Logo Upload */}
                <div className="space-y-3">
                  <Label>Brand Logo</Label>
                  <p className="text-sm text-muted-foreground">
                    Upload a custom logo for QR codes and splash screen (1:1 ratio recommended)
                  </p>
                  <div className="flex items-center gap-4">
                    {brandingLogoUrl ? (
                      <div className="relative">
                        <div className="w-20 h-20 rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
                          <img 
                            src={brandingLogoUrl} 
                            alt="Brand logo" 
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 w-6 h-6"
                          onClick={handleRemoveLogo}
                          data-testid="button-remove-logo"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                        <Upload className="w-6 h-6 text-muted-foreground/50" />
                      </div>
                    )}
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        data-testid="input-logo-upload"
                      />
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        data-testid="button-upload-logo"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {isUploading ? "Uploading..." : "Upload Logo"}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Welcome Message */}
                <div className="space-y-2">
                  <Label htmlFor="welcomeMessage">Welcome Message</Label>
                  <p className="text-sm text-muted-foreground">
                    Displayed on splash screen when guests open your menu
                  </p>
                  <Textarea
                    id="welcomeMessage"
                    placeholder="Welcome to Bar Flores..."
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    className="resize-none"
                    rows={2}
                    data-testid="input-welcome-message"
                  />
                </div>

                {/* Typography */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Type className="w-4 h-4" />
                    <Label>Typography</Label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="headlineFont" className="text-sm text-muted-foreground">
                        Headline Font
                      </Label>
                      <Select value={headlineFont} onValueChange={setHeadlineFont}>
                        <SelectTrigger id="headlineFont" data-testid="select-headline-font">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_PRESETS.headline.map((font) => (
                            <SelectItem key={font.id} value={font.id}>
                              <span style={{ fontFamily: font.family }}>{font.name}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bodyFont" className="text-sm text-muted-foreground">
                        Body Font
                      </Label>
                      <Select value={bodyFont} onValueChange={setBodyFont}>
                        <SelectTrigger id="bodyFont" data-testid="select-body-font">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_PRESETS.body.map((font) => (
                            <SelectItem key={font.id} value={font.id}>
                              <span style={{ fontFamily: font.family }}>{font.name}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* QR Code Style */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4" />
                    <Label>QR Code Style</Label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="qrDotStyle" className="text-sm text-muted-foreground">
                        Dot Pattern
                      </Label>
                      <Select value={qrDotStyle} onValueChange={setQrDotStyle}>
                        <SelectTrigger id="qrDotStyle" data-testid="select-qr-dot-style">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {QR_STYLES.dotStyles.map((style) => (
                            <SelectItem key={style.id} value={style.id}>
                              {style.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="qrEyeStyle" className="text-sm text-muted-foreground">
                        Corner Style
                      </Label>
                      <Select value={qrEyeStyle} onValueChange={setQrEyeStyle}>
                        <SelectTrigger id="qrEyeStyle" data-testid="select-qr-eye-style">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {QR_STYLES.eyeStyles.map((style) => (
                            <SelectItem key={style.id} value={style.id}>
                              {style.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveBranding}
                    disabled={!hasBrandingChanges || updateSettingsPending || settingsLoading}
                    data-testid="button-save-branding"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateSettingsPending ? "Saving..." : "Save Branding"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Anti-spam */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                Anti-spam
              </CardTitle>
              <CardDescription>
                Throttle guest order placement by client IP. Useful on a public
                site to prevent flooding from random visitors.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2 max-w-md">
                  <Label htmlFor="orderRateLimit">
                    Max orders per IP per hour
                  </Label>
                  <Input
                    id="orderRateLimit"
                    type="number"
                    min={0}
                    max={1000}
                    value={orderRateLimitPerHour}
                    onChange={(e) =>
                      setOrderRateLimitPerHour(parseInt(e.target.value) || 0)
                    }
                    disabled={settingsLoading}
                    data-testid="input-order-rate-limit"
                    className="w-32"
                  />
                  <p className="text-sm text-muted-foreground">
                    Default <strong>10</strong>. Set to <strong>0</strong> to
                    disable the limit entirely (e.g., on a private network where
                    spam isn't a concern). Capped at 1000 — anything larger is
                    effectively unlimited.
                  </p>
                </div>

                {!antiSpamValid && (
                  <p className="text-sm text-destructive">
                    Rate limit must be between 0 and 1000.
                  </p>
                )}

                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveAntiSpam}
                    disabled={
                      !hasAntiSpamChanges ||
                      !antiSpamValid ||
                      updateSettingsPending ||
                      settingsLoading
                    }
                    data-testid="button-save-anti-spam"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateSettingsPending ? "Saving..." : "Save Anti-spam"}
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
