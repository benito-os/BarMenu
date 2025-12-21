import { useState, useCallback } from "react";
import { useZxing } from "react-zxing";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Camera, X, AlertCircle, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ProductInfo {
  name: string;
  brand: string;
  category: string;
  barcode: string;
  found: boolean;
}

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onAddIngredient: (ingredient: {
    name: string;
    category: string;
    unit: string;
    onHand: number;
    parLevel: number;
  }) => void;
}

type ScanState = "scanning" | "loading" | "result" | "not_found";

export function BarcodeScanner({ open, onClose, onAddIngredient }: BarcodeScannerProps) {
  const { toast } = useToast();
  const [scanState, setScanState] = useState<ScanState>("scanning");
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    unit: "bottles",
    onHand: 1,
    parLevel: 2,
  });

  const lookupMutation = useMutation({
    mutationFn: async (barcode: string) => {
      const response = await apiRequest("POST", "/api/barcode/lookup", { barcode });
      return response.json() as Promise<ProductInfo>;
    },
    onSuccess: (data) => {
      setProductInfo(data);
      if (data.found) {
        setFormData(prev => ({
          ...prev,
          name: data.name || data.brand || "",
          category: data.category || "Spirits",
        }));
        setScanState("result");
      } else {
        setScanState("not_found");
      }
    },
    onError: () => {
      toast({
        title: "Lookup failed",
        description: "Could not look up barcode. Please try again or enter manually.",
        variant: "destructive",
      });
      setScanState("not_found");
    },
  });

  const handleDecode = useCallback((result: { getText: () => string }) => {
    const barcode = result.getText();
    if (barcode && scanState === "scanning") {
      setScannedBarcode(barcode);
      setScanState("loading");
      lookupMutation.mutate(barcode);
    }
  }, [scanState, lookupMutation]);

  const { ref } = useZxing({
    onDecodeResult: handleDecode,
    paused: scanState !== "scanning",
  });

  const handleReset = () => {
    setScanState("scanning");
    setProductInfo(null);
    setScannedBarcode("");
    setFormData({
      name: "",
      category: "",
      unit: "bottles",
      onHand: 1,
      parLevel: 2,
    });
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleAdd = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for this ingredient.",
        variant: "destructive",
      });
      return;
    }
    onAddIngredient({
      name: formData.name,
      category: formData.category || null as any,
      unit: formData.unit,
      onHand: formData.onHand,
      parLevel: formData.parLevel,
    });
    toast({
      title: "Ingredient added",
      description: `${formData.name} has been added to inventory.`,
    });
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan Barcode
          </DialogTitle>
          <DialogDescription>
            {scanState === "scanning" && "Point your camera at a product barcode"}
            {scanState === "loading" && "Looking up product..."}
            {scanState === "result" && "Product found! Review and add to inventory"}
            {scanState === "not_found" && "Barcode not found. Enter details manually"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {scanState === "scanning" && (
            <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
              <video
                ref={ref as React.RefObject<HTMLVideoElement>}
                className="h-full w-full object-cover"
                data-testid="video-barcode-scanner"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-3/4 h-1/2 border-2 border-white/50 rounded-lg" />
              </div>
            </div>
          )}

          {scanState === "loading" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Looking up barcode: {scannedBarcode}</p>
            </div>
          )}

          {(scanState === "result" || scanState === "not_found") && (
            <div className="space-y-4">
              {scanState === "not_found" && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  <div className="text-sm">
                    <p className="font-medium">Barcode: {scannedBarcode}</p>
                    <p className="text-muted-foreground">Not found in database</p>
                  </div>
                </div>
              )}

              {scanState === "result" && productInfo && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <div className="text-sm">
                    <p className="font-medium">{productInfo.brand || "Unknown Brand"}</p>
                    <p className="text-muted-foreground">{productInfo.name}</p>
                  </div>
                </div>
              )}

              <div className="grid gap-3">
                <div className="space-y-1">
                  <Label htmlFor="scan-name">Name</Label>
                  <Input
                    id="scan-name"
                    data-testid="input-scan-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter ingredient name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="scan-category">Category</Label>
                    <Input
                      id="scan-category"
                      data-testid="input-scan-category"
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      placeholder="Spirits"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="scan-unit">Unit</Label>
                    <Input
                      id="scan-unit"
                      data-testid="input-scan-unit"
                      value={formData.unit}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                      placeholder="bottles"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="scan-on-hand">On Hand</Label>
                    <Input
                      id="scan-on-hand"
                      data-testid="input-scan-on-hand"
                      type="number"
                      value={formData.onHand}
                      onChange={(e) => setFormData(prev => ({ ...prev, onHand: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="scan-par-level">Par Level</Label>
                    <Input
                      id="scan-par-level"
                      data-testid="input-scan-par-level"
                      type="number"
                      value={formData.parLevel}
                      onChange={(e) => setFormData(prev => ({ ...prev, parLevel: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row gap-2 justify-end">
          {scanState === "scanning" && (
            <Button variant="outline" onClick={handleClose} data-testid="button-cancel-scan">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          )}
          {(scanState === "result" || scanState === "not_found") && (
            <>
              <Button variant="outline" onClick={handleReset} data-testid="button-scan-again">
                <Camera className="h-4 w-4 mr-2" />
                Scan Again
              </Button>
              <Button onClick={handleAdd} data-testid="button-add-scanned">
                Add to Inventory
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
