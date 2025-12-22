import { useState, useCallback, useEffect, useRef } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Camera, X, AlertCircle, Package, VideoOff, Focus } from "lucide-react";
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

type ScanState = "scanning" | "capturing" | "loading" | "result" | "not_found" | "no_barcode" | "error";

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

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

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

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error("Video element not found"));
            return;
          }
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play()
              .then(() => resolve())
              .catch(reject);
          };
          videoRef.current.onerror = () => reject(new Error("Video error"));
        });

        if (!readerRef.current) {
          readerRef.current = new BrowserMultiFormatReader();
        }
      }
    } catch (error) {
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
        } else if (error.name === "AbortError") {
          errorMessage = "Camera access was interrupted.";
        }
      }
      
      setCameraError(errorMessage);
      setScanState("error");
    }
  }, []);

  const handleCapture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !readerRef.current) {
      return;
    }

    setScanState("capturing");

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      setScanState("scanning");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      const result = await readerRef.current.decodeFromCanvas(canvas);
      const barcode = result.getText();
      
      if (barcode) {
        stopCamera();
        setScannedBarcode(barcode);
        setScanState("loading");
        lookupMutation.mutate(barcode);
      } else {
        setScanState("no_barcode");
      }
    } catch (error) {
      console.log("No barcode detected in frame");
      setScanState("no_barcode");
    }
  }, [stopCamera, lookupMutation]);

  useEffect(() => {
    if (open && scanState === "scanning") {
      const timer = setTimeout(() => {
        startCamera();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, scanState, startCamera]);

  useEffect(() => {
    if (!open) {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [open, stopCamera]);

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
    stopCamera();
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

  const handleTryAgain = () => {
    setScanState("scanning");
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

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan Barcode
          </DialogTitle>
          <DialogDescription>
            {scanState === "scanning" && "Position the barcode in the frame, then tap Capture"}
            {scanState === "capturing" && "Scanning..."}
            {scanState === "loading" && "Looking up product..."}
            {scanState === "result" && "Product found! Review and add to inventory"}
            {scanState === "not_found" && "Barcode not found. Enter details manually"}
            {scanState === "no_barcode" && "No barcode detected. Try again"}
            {scanState === "error" && "Camera access failed"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto min-h-0">
          {(scanState === "scanning" || scanState === "capturing" || scanState === "no_barcode") && (
            <div className="relative aspect-[4/3] sm:aspect-video overflow-hidden rounded-lg bg-black">
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                autoPlay
                playsInline
                muted
                data-testid="video-barcode-scanner"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-3/4 h-1/2 border-2 border-white/50 rounded-lg flex items-center justify-center">
                  {scanState === "capturing" && (
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  )}
                </div>
              </div>
              {scanState === "no_barcode" && (
                <div className="absolute bottom-2 left-2 right-2 bg-destructive/90 text-destructive-foreground text-sm p-2 rounded text-center">
                  No barcode found. Position the barcode clearly and try again.
                </div>
              )}
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />

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

        <DialogFooter className="flex-row gap-2 justify-end flex-shrink-0">
          {(scanState === "scanning" || scanState === "capturing" || scanState === "no_barcode" || scanState === "error") && (
            <Button variant="outline" onClick={handleClose} data-testid="button-cancel-scan">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          )}
          {(scanState === "scanning" || scanState === "no_barcode") && (
            <Button onClick={handleCapture} data-testid="button-capture-barcode">
              <Focus className="h-4 w-4 mr-2" />
              Capture
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
