import { useRef, useCallback } from "react";
import { QRCode } from "react-qrcode-logo";
import { Button } from "@/components/ui/button";
import { Download, Share2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import defaultLogo from "@assets/generated_images/elegant_bf_cocktail_bar_logo.png";

interface BrandedQRCodeProps {
  url: string;
  menuName?: string;
  slug?: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
  showActions?: boolean;
  showDownload?: boolean;
  showShare?: boolean;
  className?: string;
  customLogoUrl?: string | null;
  dotStyle?: "dots" | "squares";
  eyeStyle?: "rounded" | "square";
}

export function BrandedQRCode({
  url,
  menuName = "Menu",
  slug = "menu",
  size = 256,
  fgColor = "#1a1a1a",
  bgColor = "#ffffff",
  showActions = true,
  showDownload = true,
  showShare = true,
  className = "",
  customLogoUrl = null,
  dotStyle = "dots",
  eyeStyle = "rounded",
}: BrandedQRCodeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const logoImage = customLogoUrl || defaultLogo;
  const qrStyle = dotStyle === "squares" ? "squares" : "dots";
  const eyeRadius: [{ outer: number; inner: number }, { outer: number; inner: number }, { outer: number; inner: number }] = eyeStyle === "square" 
    ? [{ outer: 0, inner: 0 }, { outer: 0, inner: 0 }, { outer: 0, inner: 0 }]
    : [{ outer: 8, inner: 4 }, { outer: 8, inner: 4 }, { outer: 8, inner: 4 }];

  const downloadQRCode = useCallback(() => {
    if (!containerRef.current) return;

    try {
      const canvas = containerRef.current.querySelector("canvas");
      if (!canvas) {
        toast({
          title: "Download Failed",
          description: "Could not find QR code canvas",
          variant: "destructive",
        });
        return;
      }

      canvas.toBlob((blob: Blob | null) => {
        if (!blob) {
          toast({
            title: "Download Failed",
            description: "Could not generate image",
            variant: "destructive",
          });
          return;
        }
        
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `bar-flores-qr-${slug}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);

        toast({
          title: "QR Code Downloaded",
          description: `Saved as bar-flores-qr-${slug}.png`,
        });
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  }, [slug, toast]);

  const shareQRCode = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Bar Flores - ${menuName}`,
          text: `Check out the ${menuName} at Bar Flores`,
          url: url,
        });
        toast({
          title: "Shared Successfully",
        });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          await copyToClipboard();
        }
      }
    } else {
      await copyToClipboard();
    }
  }, [url, menuName, toast]);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link Copied",
        description: "Menu URL copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Please copy the URL manually",
        variant: "destructive",
      });
    }
  }, [url, toast]);

  const logoSize = Math.max(size * 0.2, 40);

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <div 
        ref={containerRef}
        className="rounded-lg p-4 shadow-sm border"
        style={{ backgroundColor: bgColor }}
        data-testid="container-branded-qr"
      >
        <QRCode
          value={url}
          size={size}
          logoImage={logoImage}
          logoWidth={logoSize}
          logoHeight={logoSize}
          logoOpacity={1}
          removeQrCodeBehindLogo={true}
          logoPadding={4}
          logoPaddingStyle="circle"
          fgColor={fgColor}
          bgColor={bgColor}
          qrStyle={qrStyle}
          eyeRadius={eyeRadius}
          ecLevel="H"
          enableCORS={true}
        />
      </div>

      {showActions && (showDownload || showShare) && (
        <div className="flex gap-2">
          {showDownload && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={downloadQRCode}
              data-testid="button-download-branded-qr"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          )}
          {showShare && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={shareQRCode}
              data-testid="button-share-branded-qr"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function CopyLinkButton({ url, className = "" }: { url: string; className?: string }) {
  const { toast } = useToast();

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
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

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={copyToClipboard}
      className={className}
      data-testid="button-copy-link"
    >
      <Copy className="w-4 h-4" />
    </Button>
  );
}
