import { useState, useCallback, useEffect } from "react";
import { useZxing } from "react-zxing";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Camera, X, AlertCircle, Package, VideoOff } from "lucide-react";
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
    category: string | null;
    unit: string;
    onHand: number;
    parLevel: number;
  }) => void;
}

type ScanState = "scanning" | "loading" | "result" | "not_found" | "error";

export function BarcodeScanner({ open, onClose, onAddIngredient }: BarcodeScannerProps) {
  const { toast } = useToast();
  const [scanState, setScanState] = useState<ScanState>("scanning");
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
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

  const handleCameraError = useCallback((error: unknown) => {
    console.error("Camera error:", error);
    let errorMessage = "Could not access camera.";
    
    if (error instanceof Error) {
      if (error.name === "NotAllowedError" || error.message.includes("Permission")) {
        errorMessage = "Camera permission denied. Please allow camera access in your browser settings and try again.";
      } else if (error.name === "NotFoundError" || error.message.includes("not found")) {
        errorMessage = "No camera found on this device.";
      } else if (error.name === "NotReadableError" || error.message.includes("Could not start")) {
        errorMessage = "Camera is in use by another application.";
      } else if (error.name === "OverconstrainedError") {
        errorMessage = "Camera does not meet requirements.";
      }
    }
    
    setCameraError(errorMessage);
    setScanState("error");
  }, []);

  // Scanner is paused when not open OR not in scanning state
  const shouldPause = !open || scanState !== "scanning";

  const { ref: zxingRef } = useZxing({
    onDecodeResult: handleDecode,
    onError: handleCameraError,
    paused: shouldPause,
    constraints: {
      video: {
        facingMode: "environment",
      },
      audio: false,
    },
  });

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setScanState("scanning");
      setProductInfo(null);
      setScannedBarcode("");
      setCameraError(null);
      setFormData({
        name: "",
        category: "",
        unit: "bottles",
        onHand: 1,
        parLevel: 2,
      });
    }
  }, [open]);

  const handleScanAgain = () => {
    setScanState("scanning");
    setProductInfo(null);
    setScannedBarcode("");
    setCameraError(null);
    setFormData({
      name: "",
      category: "",
      unit: "bottles",
      onHand: 1,
      parLevel: 2,
    });
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
      category: formData.category.trim() || null,
      unit: formData.unit,
      onHand: formData.onHand,
      parLevel: formData.parLevel,
    });
    toast({
      title: "Ingredient added",
      description: `${formData.name} has been added to inventory.`,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
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
            {scanState === "error" && "Camera access failed"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {scanState === "scanning" && (
            <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
              <video
                ref={zxingRef as React.RefObject<HTMLVideoElement>}
                className="h-full w-full object-cover"
                autoPlay
                playsInline
                muted
                data-testid="video-barcode-scanner"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-3/4 h-1/2 border-2 border-white/50 rounded-lg" />
              </div>
            </div>
          )}

          {scanState === "error" && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className="p-4 rounded-full bg-destructive/10">
                <VideoOff className="h-8 w-8 text-destructive" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-medium">Camera Unavailable</p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  {cameraError}
                </p>
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
          {(scanState === "scanning" || scanState === "error") && (
            <Button variant="outline" onClick={onClose} data-testid="button-cancel-scan">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          )}
          {scanState === "error" && (
            <Button onClick={handleScanAgain} data-testid="button-retry-scan">
              <Camera className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
          {(scanState === "result" || scanState === "not_found") && (
            <>
              <Button variant="outline" onClick={handleScanAgain} data-testid="button-scan-again">
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
