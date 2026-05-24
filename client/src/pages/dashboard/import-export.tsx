import { useState, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Download,
  Upload,
  FileSpreadsheet,
  Menu as MenuIcon,
  Wine,
  Boxes,
  ShoppingCart,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Info,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

type DataType = "menus" | "drinks" | "ingredients" | "orders";

interface ImportResult {
  imported: number;
  errors: string[];
}

interface PreviewResult {
  preview: true;
  totalRows: number;
  validRows: number;
  errors: string[];
  sample: Record<string, unknown>[];
}

const dataTypes: { id: DataType; label: string; icon: typeof MenuIcon; description: string }[] = [
  { id: "menus", label: "Menus", icon: MenuIcon, description: "Menu collections with theming" },
  { id: "drinks", label: "Drinks", icon: Wine, description: "Cocktails and beverage items" },
  { id: "ingredients", label: "Ingredients", icon: Boxes, description: "Inventory ingredients" },
  { id: "orders", label: "Orders", icon: ShoppingCart, description: "Customer orders" },
];

export default function ImportExportPage() {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<DataType>("menus");
  const [importResults, setImportResults] = useState<ImportResult | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [pendingCsv, setPendingCsv] = useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 1: POST with ?dryRun=true to validate + sample without writing.
  const previewMutation = useMutation({
    mutationFn: async ({ type, csv }: { type: DataType; csv: string }) => {
      const response = await apiRequest("POST", `/api/import/${type}?dryRun=true`, { csv });
      return response.json() as Promise<PreviewResult>;
    },
    onSuccess: (data) => {
      setPreview(data);
      setImportResults(null);
    },
    onError: (error) => {
      toast({
        title: "Preview failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      resetPending();
    },
  });

  // Step 2: POST the same csv without dryRun to actually write.
  const importMutation = useMutation({
    mutationFn: async ({ type, csv }: { type: DataType; csv: string }) => {
      const response = await apiRequest("POST", `/api/import/${type}`, { csv });
      return response.json() as Promise<ImportResult>;
    },
    onSuccess: (data) => {
      setImportResults(data);
      setPreview(null);
      resetPending();
      if (data.imported > 0) {
        toast({
          title: "Import successful",
          description: `Imported ${data.imported} ${selectedType}${data.errors.length > 0 ? ` with ${data.errors.length} errors` : ""}`,
        });
        queryClient.invalidateQueries({ queryKey: [`/api/${selectedType}`] });
        queryClient.invalidateQueries({ queryKey: ["/api/menus"] });
        queryClient.invalidateQueries({ queryKey: ["/api/ingredients"] });
      } else if (data.errors.length > 0) {
        toast({
          title: "Import failed",
          description: `No items imported. ${data.errors.length} errors found.`,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const resetPending = () => {
    setPendingCsv(null);
    setPendingFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const cancelPreview = () => {
    setPreview(null);
    resetPending();
  };

  const confirmImport = () => {
    if (!pendingCsv) return;
    importMutation.mutate({ type: selectedType, csv: pendingCsv });
  };

  const handleExport = (type: DataType) => {
    window.location.href = `/api/export/${type}`;
  };

  const handleDownloadTemplate = (type: DataType) => {
    window.location.href = `/api/templates/${type}`;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result as string;
      if (!csv) return;
      setPendingCsv(csv);
      setPendingFileName(file.name);
      previewMutation.mutate({ type: selectedType, csv });
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const currentType = dataTypes.find(t => t.id === selectedType)!;
  const Icon = currentType.icon;
  const isPending = previewMutation.isPending || importMutation.isPending;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-full">
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold font-serif">Import & Export</h1>
            <p className="text-muted-foreground mt-2">
              Manage your data with CSV imports and exports
            </p>
          </div>

          <Tabs
            value={selectedType}
            onValueChange={(v) => {
              setSelectedType(v as DataType);
              setImportResults(null);
              setPreview(null);
              resetPending();
            }}
          >
            <TabsList className="grid w-full grid-cols-4 mb-6">
              {dataTypes.map((type) => (
                <TabsTrigger key={type.id} value={type.id} className="flex items-center gap-2" data-testid={`tab-${type.id}`}>
                  <type.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{type.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {dataTypes.map((type) => (
              <TabsContent key={type.id} value={type.id} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Download className="w-5 h-5" />
                        Export {type.label}
                      </CardTitle>
                      <CardDescription>
                        Download all {type.label.toLowerCase()} as a CSV file
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Export your current {type.label.toLowerCase()} data including all fields.
                        The exported file can be used as a backup or to transfer data.
                      </p>
                      <Button onClick={() => handleExport(type.id)} className="w-full" data-testid={`button-export-${type.id}`}>
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Export {type.label} CSV
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        CSV Template
                      </CardTitle>
                      <CardDescription>
                        Download a template with example data
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Get a properly formatted template with column headers and example data.
                        Fields marked with "(REQUIRED)" must be filled in.
                      </p>
                      <Button variant="outline" onClick={() => handleDownloadTemplate(type.id)} className="w-full" data-testid={`button-template-${type.id}`}>
                        <Download className="w-4 h-4 mr-2" />
                        Download Template
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="w-5 h-5" />
                      Import {type.label}
                    </CardTitle>
                    <CardDescription>
                      Upload a CSV file to add new {type.label.toLowerCase()} — you'll see a preview before anything is written
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Alert>
                      <Info className="w-4 h-4" />
                      <AlertTitle>Before importing</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                          <li>Download the template first to see the required format</li>
                          <li>Fields marked "(REQUIRED)" in the header must have values</li>
                          <li>For drinks, you'll need valid menu IDs from your existing menus</li>
                          <li>Boolean fields accept "true" or "false" values</li>
                          <li>Imports create new records (existing records are not updated)</li>
                          <li>Selecting a file shows a preview — nothing is written until you click <strong>Confirm import</strong></li>
                        </ul>
                      </AlertDescription>
                    </Alert>

                    {/* File picker — only shown when not in preview mode */}
                    {!preview && (
                      <div className="flex flex-col sm:flex-row gap-4">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv"
                          onChange={handleFileSelect}
                          className="hidden"
                          data-testid={`input-file-${type.id}`}
                        />
                        <Button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isPending}
                          className="flex-1"
                          data-testid={`button-import-${type.id}`}
                        >
                          {previewMutation.isPending ? (
                            <>Parsing CSV...</>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Select CSV File
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    {/* Preview panel — shown after a successful dry-run */}
                    {preview && (
                      <div className="space-y-4 rounded-lg border p-4 bg-muted/30" data-testid="import-preview">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold">Preview: {pendingFileName}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              <span className="font-medium text-foreground">{preview.validRows}</span>{" "}
                              of <span className="font-medium text-foreground">{preview.totalRows}</span>{" "}
                              rows ready to import
                              {preview.errors.length > 0 && (
                                <>
                                  {" — "}
                                  <span className="text-destructive font-medium">
                                    {preview.errors.length} {preview.errors.length === 1 ? "row will be skipped" : "rows will be skipped"}
                                  </span>
                                </>
                              )}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={cancelPreview}
                            data-testid="button-cancel-preview"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        </div>

                        {preview.errors.length > 0 && (
                          <Alert variant="destructive">
                            <AlertTriangle className="w-4 h-4" />
                            <AlertTitle>Parse errors</AlertTitle>
                            <AlertDescription>
                              <ul className="list-disc list-inside mt-2 space-y-1 text-sm max-h-32 overflow-y-auto">
                                {preview.errors.slice(0, 20).map((error, i) => (
                                  <li key={i}>{error}</li>
                                ))}
                                {preview.errors.length > 20 && (
                                  <li className="italic">
                                    …and {preview.errors.length - 20} more
                                  </li>
                                )}
                              </ul>
                            </AlertDescription>
                          </Alert>
                        )}

                        {preview.sample.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">
                              Sample of valid rows (first {preview.sample.length}):
                            </p>
                            <div className="rounded-md border overflow-x-auto bg-background">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    {Object.keys(preview.sample[0]).map((key) => (
                                      <TableHead key={key} className="text-xs whitespace-nowrap">
                                        {key}
                                      </TableHead>
                                    ))}
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {preview.sample.map((row, i) => (
                                    <TableRow key={i}>
                                      {Object.keys(preview.sample[0]).map((key) => (
                                        <TableCell key={key} className="text-xs whitespace-nowrap max-w-[200px] truncate">
                                          {formatCellValue(row[key])}
                                        </TableCell>
                                      ))}
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 justify-end pt-2 border-t">
                          <Button
                            variant="outline"
                            onClick={cancelPreview}
                            disabled={importMutation.isPending}
                            data-testid="button-cancel-import"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={confirmImport}
                            disabled={importMutation.isPending || preview.validRows === 0}
                            data-testid="button-confirm-import"
                          >
                            {importMutation.isPending ? (
                              <>Importing...</>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Confirm import ({preview.validRows} {preview.validRows === 1 ? "row" : "rows"})
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Final result panel — shown after a successful import */}
                    {importResults && !preview && (
                      <div className="space-y-4 mt-4">
                        {importResults.imported > 0 && (
                          <Alert className="border-success/50 bg-success/10">
                            <CheckCircle2 className="w-4 h-4 text-success" />
                            <AlertTitle className="text-success">
                              Successfully imported
                            </AlertTitle>
                            <AlertDescription>
                              {importResults.imported} {type.label.toLowerCase()} were added to the database.
                            </AlertDescription>
                          </Alert>
                        )}

                        {importResults.errors.length > 0 && (
                          <Alert variant="destructive">
                            <AlertTriangle className="w-4 h-4" />
                            <AlertTitle>Import errors</AlertTitle>
                            <AlertDescription>
                              <ul className="list-disc list-inside mt-2 space-y-1 text-sm max-h-40 overflow-y-auto">
                                {importResults.errors.map((error, i) => (
                                  <li key={i}>{error}</li>
                                ))}
                              </ul>
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Icon className="w-5 h-5" />
                      {type.label} Field Reference
                    </CardTitle>
                    <CardDescription>
                      Required and optional fields for {type.label.toLowerCase()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FieldReference type={type.id} />
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) return value.join(", ") || "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function FieldReference({ type }: { type: DataType }) {
  const fields: Record<DataType, { name: string; required: boolean; description: string }[]> = {
    menus: [
      { name: "slug", required: true, description: "URL-friendly identifier (e.g., 'summer-2024')" },
      { name: "name", required: true, description: "Display name for the menu" },
      { name: "description", required: false, description: "Optional menu description" },
      { name: "isActive", required: false, description: "Whether menu is active (true/false)" },
      { name: "heroImageUrl", required: false, description: "URL for the hero image" },
      { name: "backgroundColor", required: false, description: "Background color (e.g., '#ffffff')" },
      { name: "accentColor", required: false, description: "Accent color (e.g., '#ff6600')" },
      { name: "typography", required: false, description: "Font family name" },
      { name: "sections", required: false, description: "Pipe-separated section names (e.g., 'Classic|Signature')" },
    ],
    drinks: [
      { name: "menuId", required: true, description: "ID of the menu this drink belongs to" },
      { name: "name", required: true, description: "Name of the drink" },
      { name: "section", required: true, description: "Menu section (e.g., 'Classic', 'Signature')" },
      { name: "description", required: false, description: "Drink description" },
      { name: "recipe", required: false, description: "Recipe or ingredients" },
      { name: "style", required: false, description: "Drink style (e.g., 'Strong & Boozy')" },
      { name: "temperature", required: false, description: "hot, cold, room_temp, or empty" },
      { name: "isMocktail", required: false, description: "Is exclusively non-alcoholic (true/false)" },
      { name: "canBeMocktail", required: false, description: "Can be made as mocktail (true/false)" },
      { name: "isStirred", required: false, description: "Is stirred (true/false)" },
      { name: "isShaken", required: false, description: "Is shaken (true/false)" },
      { name: "baseSpirit", required: false, description: "Primary spirit (e.g., 'Bourbon')" },
      { name: "isActive", required: false, description: "Is active on menu (true/false, default: true)" },
      { name: "isOutOfStock", required: false, description: "Is out of stock (true/false)" },
      { name: "sortOrder", required: false, description: "Display order (number)" },
    ],
    ingredients: [
      { name: "name", required: true, description: "Ingredient name" },
      { name: "category", required: false, description: "Category (e.g., 'Spirits', 'Mixers')" },
      { name: "unit", required: true, description: "Unit of measurement (e.g., 'bottles', 'oz')" },
      { name: "onHand", required: false, description: "Current stock quantity (number)" },
      { name: "parLevel", required: false, description: "Minimum stock level (number)" },
      { name: "isActive", required: false, description: "Is active (true/false)" },
    ],
    orders: [
      { name: "drinkId", required: true, description: "ID of the drink ordered" },
      { name: "menuId", required: true, description: "ID of the menu the order is from" },
      { name: "guestName", required: false, description: "Guest's name" },
      { name: "comments", required: false, description: "Special requests or comments" },
      { name: "asMocktail", required: false, description: "Order as mocktail (true/false)" },
    ],
  };

  return (
    <div className="space-y-2">
      {fields[type].map((field) => (
        <div key={field.name} className="flex items-start gap-3 py-2 border-b last:border-0">
          <div className="flex items-center gap-2 min-w-[140px]">
            <code className="text-sm bg-muted px-2 py-0.5 rounded">{field.name}</code>
            {field.required && (
              <Badge variant="destructive" className="text-xs">Required</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{field.description}</p>
        </div>
      ))}
    </div>
  );
}
