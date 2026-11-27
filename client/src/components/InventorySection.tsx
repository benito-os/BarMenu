import { useMemo, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Boxes, ClipboardList, Minus, Pencil, Plus, ScanBarcode, Search, Sparkles, Trash2 } from "lucide-react";
import { useIngredients } from "@/hooks/useIngredients";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { ChipRow, StickyToolbar, useScrollSpy } from "@/components/dashboard/ChipRow";
import { StatTiles } from "@/components/dashboard/StatTiles";
import { usePersistentState } from "@/hooks/usePersistentState";
import { useIsMobile } from "@/hooks/use-mobile";
import { MOBILE_SHEET_DIALOG } from "@/lib/mobileSheet";
import { anchorId, scrollToAnchor } from "@/lib/scroll";

const UNCATEGORIZED = "Uncategorized";

/**
 * `actions` renders next to the title on desktop and in the phone action row
 * (the inventory page passes the Shopping list button).
 */
export function InventorySection({ actions }: { actions?: ReactNode } = {}) {
  const { 
    ingredients, 
    ingredientsLoading, 
    createIngredient, 
    createIngredientPending, 
    updateIngredient, 
    updateIngredientPending,
    adjustStock,
    deleteIngredient,
    deleteIngredientPending
  } = useIngredients();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  // Remembered per browser so a restock run reopens on "Low".
  const [statusFilter, setStatusFilter] = usePersistentState<string>("barflores.inventory.status", "all");
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    category: "",
    unit: "",
    onHand: 0,
    parLevel: 0,
  });
  const [newIngredient, setNewIngredient] = useState({
    name: "",
    category: "",
    unit: "units",
    onHand: 0,
    parLevel: 0,
    isActive: true,
  });
  const [scannerOpen, setScannerOpen] = useState(false);
  // `actions` (e.g. the Shopping list sheet) is rendered exactly once, in the
  // header on desktop or the action row on phones, so its trigger and state
  // are never duplicated.
  const isMobile = useIsMobile();
  const [addFormOpen, setAddFormOpen] = useState(false);

  const categories = useMemo(() => {
    const unique = new Set(ingredients.map(item => item.category).filter((c): c is string => Boolean(c)));
    return ["all", ...Array.from(unique)];
  }, [ingredients]);

  const filteredItems = useMemo(() => {
    return ingredients.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      const isLow = item.onHand > 0 && item.onHand <= item.parLevel;
      const isOut = item.onHand <= 0;
      const status = isOut ? "out" : isLow ? "low" : "healthy";
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [ingredients, searchTerm, categoryFilter, statusFilter]);

  const summary = useMemo(() => {
    const total = ingredients.length;
    const low = ingredients.filter(item => item.onHand > 0 && item.onHand <= item.parLevel).length;
    const out = ingredients.filter(item => item.onHand <= 0).length;
    const healthy = ingredients.filter(item => item.onHand > item.parLevel).length;
    return { total, low, out, healthy };
  }, [ingredients]);

  const restockPercent = useMemo(() => {
    const urgency = summary.low + summary.out;
    if (summary.total === 0) return 0;
    return Math.round((urgency / summary.total) * 100);
  }, [summary]);

  // Phone list is grouped by category; chips jump between groups.
  const mobileGroups = useMemo(() => {
    const groups = new Map<string, typeof filteredItems>();
    for (const item of filteredItems) {
      const key = item.category?.trim() || UNCATEGORIZED;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    return Array.from(groups.entries())
      .sort(([a], [b]) => (a === UNCATEGORIZED ? 1 : b === UNCATEGORIZED ? -1 : a.localeCompare(b)))
      .map(([name, items]) => ({ name, id: anchorId("inv-cat", name), items: [...items].sort((x, y) => x.name.localeCompare(y.name)) }));
  }, [filteredItems]);
  const activeGroupId = useScrollSpy(mobileGroups.map((g) => g.id));

  const resetNewIngredient = () =>
    setNewIngredient({
      name: "",
      category: "",
      unit: "units",
      onHand: 0,
      parLevel: 0,
      isActive: true,
    });

  const editingIngredient = ingredients.find((ingredient) => ingredient.id === editingIngredientId) || null;

  const handleEditOpen = (ingredientId: string) => {
    const target = ingredients.find((ingredient) => ingredient.id === ingredientId);
    if (!target) return;
    setEditForm({
      name: target.name,
      category: target.category || "",
      unit: target.unit,
      onHand: target.onHand,
      parLevel: target.parLevel,
    });
    setEditingIngredientId(ingredientId);
  };

  const handleSaveEdit = () => {
    if (!editingIngredient) return;
    updateIngredient({
      id: editingIngredient.id,
      name: editForm.name,
      category: editForm.category || null,
      unit: editForm.unit,
      onHand: editForm.onHand,
      parLevel: editForm.parLevel,
    });
    setEditingIngredientId(null);
  };

  const handleDelete = (ingredientId: string) => {
    deleteIngredient(ingredientId);
    if (editingIngredientId === ingredientId) {
      setEditingIngredientId(null);
    }
  };

  return (
    <>
      <div className="hidden md:flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-serif font-semibold">Inventory</h2>
          <p className="text-sm text-muted-foreground">
            Track ingredients, spot low stock early, and manage your bar inventory.
          </p>
        </div>
        {!isMobile && actions}
      </div>

      {/* Phone: one row of tiles that filter the list, then the actions. */}
      <div className="md:hidden space-y-3 max-md:!mt-0">
        <StatTiles
          ariaLabel="Filter ingredients by stock"
          activeId={statusFilter}
          onSelect={(id) => setStatusFilter((prev) => (prev === id && id !== "all" ? "all" : id))}
          tiles={[
            { id: "all", label: "All", value: summary.total, testId: "tile-inventory-all" },
            { id: "low", label: "Low", value: summary.low, tone: "warning", testId: "tile-inventory-low" },
            { id: "out", label: "Out", value: summary.out, tone: "destructive", testId: "tile-inventory-out" },
            { id: "healthy", label: "OK", value: summary.healthy, tone: "success", testId: "tile-inventory-healthy" },
          ]}
        />
        <div className="flex gap-2 [&>*]:flex-1 [&>*:last-child]:flex-[1.4]">
          <Button
            className="min-h-11"
            onClick={() => setAddFormOpen(true)}
            data-testid="button-toggle-add-form"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add
          </Button>
          <Button
            variant="outline"
            className="min-h-11"
            data-testid="mobile-button-scan-to-add"
            onClick={() => setScannerOpen(true)}
          >
            <ScanBarcode className="h-4 w-4 mr-1.5" />
            Scan
          </Button>
          {isMobile && actions}
        </div>
      </div>

      <div className="hidden md:grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ingredients</CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold" data-testid="text-total-ingredients">{summary.total}</div>
            <p className="text-xs text-muted-foreground">Across all bar stations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-semibold" data-testid="text-low-stock">{summary.low}</div>
            <p className="text-xs text-muted-foreground">{summary.out} out of stock today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Restock Urgency</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-semibold" data-testid="text-restock-percent">{restockPercent}%</div>
            <Progress value={restockPercent} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {summary.healthy} ingredients are at healthy levels
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="max-md:border-0 max-md:bg-transparent max-md:shadow-none">
        <CardHeader className="hidden md:flex">
          <CardTitle className="text-xl">Ingredient Inventory</CardTitle>
          <CardDescription>
            Add, update, and manage your bar ingredients.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 max-md:p-0 max-md:space-y-3">
          {/* Desktop: Always visible form */}
          <div className="hidden md:block rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Add Ingredient</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ingredient-name">Name</Label>
                <Input
                  id="ingredient-name"
                  data-testid="input-ingredient-name"
                  value={newIngredient.name}
                  onChange={(event) => setNewIngredient(prev => ({ ...prev, name: event.target.value }))}
                  placeholder="Fresh Lime Juice"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ingredient-category">Category</Label>
                <Input
                  id="ingredient-category"
                  data-testid="input-ingredient-category"
                  value={newIngredient.category}
                  onChange={(event) => setNewIngredient(prev => ({ ...prev, category: event.target.value }))}
                  placeholder="Mixers"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ingredient-unit">Unit</Label>
                <Input
                  id="ingredient-unit"
                  data-testid="input-ingredient-unit"
                  value={newIngredient.unit}
                  onChange={(event) => setNewIngredient(prev => ({ ...prev, unit: event.target.value }))}
                  placeholder="qt"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ingredient-par">Par Level</Label>
                <Input
                  id="ingredient-par"
                  data-testid="input-ingredient-par"
                  type="number"
                  value={newIngredient.parLevel}
                  onChange={(event) => setNewIngredient(prev => ({ ...prev, parLevel: Number(event.target.value) }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ingredient-on-hand">On Hand</Label>
                <Input
                  id="ingredient-on-hand"
                  data-testid="input-ingredient-on-hand"
                  type="number"
                  value={newIngredient.onHand}
                  onChange={(event) => setNewIngredient(prev => ({ ...prev, onHand: Number(event.target.value) }))}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                data-testid="button-add-ingredient"
                onClick={() => {
                  if (!newIngredient.name.trim()) return;
                  createIngredient({
                    ...newIngredient,
                    category: newIngredient.category.trim() || null,
                  });
                  setNewIngredient({
                    name: "",
                    category: "",
                    unit: "units",
                    onHand: 0,
                    parLevel: 0,
                    isActive: true,
                  });
                }}
                disabled={createIngredientPending || !newIngredient.name.trim()}
              >
                {createIngredientPending ? "Adding..." : "Add Ingredient"}
              </Button>
              <Button
                variant="outline"
                data-testid="button-scan-to-add"
                onClick={() => setScannerOpen(true)}
              >
                <ScanBarcode className="h-4 w-4 mr-2" />
                Scan to Add
              </Button>
            </div>
          </div>

          {/* Mobile: add form in a bottom sheet, opened from the action row */}
          <Sheet open={addFormOpen} onOpenChange={setAddFormOpen}>
            <SheetContent
              side="bottom"
              className="md:hidden rounded-t-2xl px-4 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] max-h-[92dvh] overflow-y-auto"
              data-testid="sheet-add-ingredient"
            >
              <SheetHeader className="text-left mb-4">
                <SheetTitle>Add ingredient</SheetTitle>
                <SheetDescription>Name is all you need; set par so low stock shows up.</SheetDescription>
              </SheetHeader>
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="mobile-ingredient-name" className="text-xs">Name</Label>
                    <Input
                      id="mobile-ingredient-name"
                      data-testid="mobile-input-ingredient-name"
                      value={newIngredient.name}
                      onChange={(event) => setNewIngredient(prev => ({ ...prev, name: event.target.value }))}
                      placeholder="Fresh Lime Juice"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="mobile-ingredient-category" className="text-xs">Category</Label>
                      <Input
                        id="mobile-ingredient-category"
                        data-testid="mobile-input-ingredient-category"
                        value={newIngredient.category}
                        onChange={(event) => setNewIngredient(prev => ({ ...prev, category: event.target.value }))}
                        placeholder="Mixers"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="mobile-ingredient-unit" className="text-xs">Unit</Label>
                      <Input
                        id="mobile-ingredient-unit"
                        data-testid="mobile-input-ingredient-unit"
                        value={newIngredient.unit}
                        onChange={(event) => setNewIngredient(prev => ({ ...prev, unit: event.target.value }))}
                        placeholder="qt"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="mobile-ingredient-par" className="text-xs">Par Level</Label>
                      <Input
                        id="mobile-ingredient-par"
                        data-testid="mobile-input-ingredient-par"
                        type="number"
                        value={newIngredient.parLevel}
                        onChange={(event) => setNewIngredient(prev => ({ ...prev, parLevel: Number(event.target.value) }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="mobile-ingredient-on-hand" className="text-xs">On Hand</Label>
                      <Input
                        id="mobile-ingredient-on-hand"
                        data-testid="mobile-input-ingredient-on-hand"
                        type="number"
                        value={newIngredient.onHand}
                        onChange={(event) => setNewIngredient(prev => ({ ...prev, onHand: Number(event.target.value) }))}
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="min-h-11"
                    data-testid="mobile-button-sheet-scan"
                    onClick={() => {
                      setAddFormOpen(false);
                      setScannerOpen(true);
                    }}
                  >
                    <ScanBarcode className="h-4 w-4 mr-1" />
                    Scan instead
                  </Button>
                  <Button
                    className="min-h-11"
                    data-testid="mobile-button-add-ingredient"
                    onClick={() => {
                      if (!newIngredient.name.trim()) return;
                      createIngredient({
                        ...newIngredient,
                        category: newIngredient.category.trim() || null,
                      });
                      resetNewIngredient();
                      setAddFormOpen(false);
                    }}
                    disabled={createIngredientPending || !newIngredient.name.trim()}
                  >
                    {createIngredientPending ? "Adding..." : "Add"}
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Phone: search + category jump chips stay pinned while counting */}
          <StickyToolbar className="md:hidden py-2 space-y-1" testId="inventory-mobile-toolbar">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
              <Input
                type="search"
                placeholder="Search ingredients"
                aria-label="Search ingredients"
                data-testid="mobile-input-search-ingredients"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-9"
              />
            </div>
            {mobileGroups.length > 1 && (
              <ChipRow
                ariaLabel="Jump to category"
                testIdPrefix="chip-inventory"
                items={mobileGroups.map((g) => ({ id: g.id, label: g.name, count: g.items.length }))}
                activeId={activeGroupId}
                onSelect={scrollToAnchor}
              />
            )}
          </StickyToolbar>

          <div className="hidden md:flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Input
              placeholder="Search ingredients"
              data-testid="input-search-ingredients"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="md:max-w-sm"
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-category-filter">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category === "all" ? "All categories" : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="healthy">Healthy</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="out">Out of stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {ingredientsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((row) => (
                <Skeleton key={row} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              {/* Mobile view - grouped by category, one 60px row per item */}
              <div className="md:hidden space-y-5" data-testid="inventory-mobile-view">
                {filteredItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    {ingredients.length === 0
                      ? "No ingredients yet. Tap \"Add\" above."
                      : (
                        <>
                          No ingredients match your filters.{" "}
                          <button
                            type="button"
                            className="underline underline-offset-2 min-h-11"
                            onClick={() => {
                              setSearchTerm("");
                              setStatusFilter("all");
                              setCategoryFilter("all");
                            }}
                          >
                            Clear filters
                          </button>
                        </>
                      )}
                  </div>
                ) : (
                  mobileGroups.map((group) => (
                    <section key={group.id} id={group.id} aria-labelledby={`${group.id}-h`}>
                      <h3 id={`${group.id}-h`} className="mb-1.5 flex items-baseline justify-between px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {group.name}
                        <span className="font-normal normal-case tracking-normal tabular-nums">{group.items.length}</span>
                      </h3>
                      <ul className="divide-y rounded-lg border bg-card overflow-hidden">
                        {group.items.map((item) => {
                          const isLow = item.onHand > 0 && item.onHand <= item.parLevel;
                          const isOut = item.onHand <= 0;
                          return (
                            <li
                              key={item.id}
                              className={`flex items-center gap-1 py-1.5 pl-3 pr-1 border-l-4 ${isOut ? "border-l-destructive bg-destructive/5" : isLow ? "border-l-warning bg-warning/5" : "border-l-transparent"}`}
                              data-testid={`mobile-ingredient-${item.id}`}
                            >
                              <button
                                type="button"
                                className="min-w-0 flex-1 min-h-11 text-left rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                onClick={() => handleEditOpen(item.id)}
                                aria-label={`Edit ${item.name}`}
                                data-testid={`mobile-button-edit-ingredient-${item.id}`}
                              >
                                <span className="flex items-center gap-1 font-medium text-[0.9375rem] leading-tight">
                                  <span className="truncate">{item.name}</span>
                                  <Pencil className="h-3 w-3 shrink-0 text-muted-foreground/60" aria-hidden />
                                </span>
                                <span className="mt-0.5 block text-xs text-muted-foreground truncate">
                                  <span className={isOut ? "text-destructive font-medium" : isLow ? "text-amber-700 font-medium" : ""}>
                                    {isOut ? "Out" : isLow ? "Low" : "OK"}
                                  </span>
                                  {" · "}par {item.parLevel} {item.unit}
                                </span>
                              </button>

                              {/* Quick stock adjustment (optimistic, silent) */}
                              <div className="flex shrink-0 items-center">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-11 w-11 rounded-r-none"
                                  aria-label={`Decrease ${item.name}`}
                                  onClick={() => adjustStock(item.id, -1)}
                                  disabled={item.onHand <= 0}
                                  data-testid={`mobile-button-decrement-${item.id}`}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <div
                                  className="flex h-11 min-w-[2.75rem] flex-col items-center justify-center border-y bg-background px-1 leading-none"
                                  data-testid={`mobile-stock-count-${item.id}`}
                                  aria-live="polite"
                                >
                                  <span className="text-base font-semibold tabular-nums">{item.onHand}</span>
                                  <span className="sr-only"> </span>
                                  <span className="mt-0.5 max-w-[3.5rem] truncate text-[0.625rem] text-muted-foreground">{item.unit}</span>
                                </div>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-11 w-11 rounded-l-none"
                                  aria-label={`Increase ${item.name}`}
                                  onClick={() => adjustStock(item.id, 1)}
                                  data-testid={`mobile-button-increment-${item.id}`}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-11 w-9 shrink-0 text-muted-foreground"
                                    aria-label={`Delete ${item.name}`}
                                    data-testid={`mobile-button-delete-ingredient-${item.id}`}
                                    disabled={deleteIngredientPending}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Ingredient</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{item.name}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(item.id)}
                                      data-testid="button-confirm-delete-ingredient-mobile"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))
                )}
              </div>

              {/* Desktop view - table layout */}
              <div className="hidden md:block overflow-x-auto" data-testid="inventory-desktop-view">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ingredient</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">On Hand</TableHead>
                      <TableHead className="text-right">Par Level</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => {
                      const isLow = item.onHand > 0 && item.onHand <= item.parLevel;
                      const isOut = item.onHand <= 0;
                      return (
                        <TableRow key={item.id} data-testid={`row-ingredient-${item.id}`}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-muted-foreground">{item.category || "-"}</TableCell>
                          <TableCell className="text-right">
                            {item.onHand} {item.unit}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {item.parLevel} {item.unit}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                isOut
                                  ? "destructive"
                                  : isLow
                                    ? "secondary"
                                    : "default"
                              }
                            >
                              {isOut ? "Out of stock" : isLow ? "Low stock" : "Healthy"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditOpen(item.id)}
                                data-testid={`button-edit-ingredient-${item.id}`}
                              >
                                <Pencil className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    data-testid={`button-delete-ingredient-${item.id}`}
                                    disabled={deleteIngredientPending}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Ingredient</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{item.name}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(item.id)}
                                      data-testid="button-confirm-delete-ingredient"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          {ingredients.length === 0 
                            ? "No ingredients yet. Add your first ingredient above."
                            : "No ingredients match your filters."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingIngredient} onOpenChange={(open) => !open && setEditingIngredientId(null)}>
        <DialogContent className={MOBILE_SHEET_DIALOG}>
          <DialogHeader>
            <DialogTitle>Edit Ingredient</DialogTitle>
            <DialogDescription>
              Update ingredient details and stock levels.
            </DialogDescription>
          </DialogHeader>
          {editingIngredient && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  data-testid="input-edit-ingredient-name"
                  value={editForm.name}
                  onChange={(event) => setEditForm(prev => ({
                    ...prev,
                    name: event.target.value,
                  }))}
                  disabled={updateIngredientPending}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-category">Category</Label>
                  <Input
                    id="edit-category"
                    data-testid="input-edit-ingredient-category"
                    value={editForm.category}
                    onChange={(event) => setEditForm(prev => ({
                      ...prev,
                      category: event.target.value,
                    }))}
                    disabled={updateIngredientPending}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-unit">Unit</Label>
                  <Input
                    id="edit-unit"
                    data-testid="input-edit-ingredient-unit"
                    value={editForm.unit}
                    onChange={(event) => setEditForm(prev => ({
                      ...prev,
                      unit: event.target.value,
                    }))}
                    disabled={updateIngredientPending}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-on-hand">On Hand</Label>
                  <Input
                    id="edit-on-hand"
                    data-testid="input-edit-ingredient-on-hand"
                    type="number"
                    value={editForm.onHand}
                    onChange={(event) => setEditForm(prev => ({
                      ...prev,
                      onHand: Number(event.target.value),
                    }))}
                    disabled={updateIngredientPending}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-par-level">Par Level</Label>
                  <Input
                    id="edit-par-level"
                    data-testid="input-edit-ingredient-par-level"
                    type="number"
                    value={editForm.parLevel}
                    onChange={(event) => setEditForm(prev => ({
                      ...prev,
                      parLevel: Number(event.target.value),
                    }))}
                    disabled={updateIngredientPending}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setEditingIngredientId(null)}
              disabled={updateIngredientPending}
              data-testid="button-cancel-edit-ingredient"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateIngredientPending || !editForm.name.trim()}
              data-testid="button-save-ingredient"
            >
              {updateIngredientPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onAddIngredient={(ingredient) => {
          createIngredient({
            ...ingredient,
            isActive: true,
          });
        }}
      />
    </>
  );
}
