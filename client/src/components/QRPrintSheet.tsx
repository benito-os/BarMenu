import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BrandedQRCode } from "@/components/BrandedQRCode";
import { Printer, X } from "lucide-react";
import type { Menu } from "@shared/validation";
import type { Settings } from "@shared/schema";

/**
 * Modal showing a printable sheet of QR codes for table tents.
 *
 * The print stylesheet injected at the bottom of this component hides the rest
 * of the app — including the Radix overlay and the modal footer — and unboxes
 * the print sheet so it lays out edge-to-edge on the printed page.
 */
interface QRPrintSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menus: Menu[];
  baseUrl: string;
  settings: Settings;
}

export function QRPrintSheet({ open, onOpenChange, menus, baseUrl, settings }: QRPrintSheetProps) {
  const printable = menus.filter((m) => m.isActive);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print-sheet-dialog">
        <DialogHeader className="screen-only">
          <DialogTitle>Print QR codes</DialogTitle>
          <DialogDescription>
            One QR code per active menu, sized for table tents. Use your
            browser's print dialog to set the paper size.
          </DialogDescription>
        </DialogHeader>

        {printable.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center screen-only">
            No active menus to print. Activate at least one menu from the Menus page.
          </p>
        ) : (
          <div className="print-sheet grid grid-cols-2 gap-6 py-4">
            {printable.map((menu) => (
              <div
                key={menu.id}
                className="qr-tent flex flex-col items-center gap-3 border rounded-lg p-4 break-inside-avoid"
              >
                <h3 className="font-serif text-xl text-center" style={{ color: menu.menuTitleColor || undefined }}>
                  {menu.name}
                </h3>
                {menu.description && (
                  <p className="text-xs text-center text-muted-foreground line-clamp-2">
                    {menu.description}
                  </p>
                )}
                <BrandedQRCode
                  url={`${baseUrl}/menu/${menu.slug}`}
                  menuName={menu.name}
                  slug={menu.slug}
                  size={220}
                  fgColor={menu.accentColor || "#1a1a1a"}
                  bgColor={menu.backgroundColor || "#ffffff"}
                  showActions={false}
                  customLogoUrl={settings.brandingLogoUrl}
                  dotStyle={settings.qrDotStyle as "dots" | "squares"}
                  eyeStyle={settings.qrEyeStyle as "rounded" | "square"}
                />
                <p className="text-xs text-muted-foreground font-mono">
                  {baseUrl.replace(/^https?:\/\//, "")}/menu/{menu.slug}
                </p>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="screen-only">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-close-print">
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
          <Button onClick={handlePrint} disabled={printable.length === 0} data-testid="button-print-sheet">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </DialogFooter>

        {/* Print rules scoped to this modal. @media print hides everything
            but the sheet itself, removes Radix overlays, and lets the tents
            flow onto multiple pages. */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-sheet-dialog,
            .print-sheet-dialog * {
              visibility: visible;
            }
            .screen-only {
              display: none !important;
            }
            .print-sheet-dialog {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              transform: none !important;
              max-width: 100% !important;
              width: 100% !important;
              max-height: none !important;
              overflow: visible !important;
              box-shadow: none !important;
              border: none !important;
              padding: 0 !important;
            }
            .qr-tent {
              page-break-inside: avoid;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
