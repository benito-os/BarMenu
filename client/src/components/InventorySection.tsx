import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Boxes, ChevronDown, ClipboardList, Minus, Pencil, Plus, ScanBarcode, Sparkles, Trash2 } from "lucide-react";
import { useIngredients } from "@/hooks/useIngredients";
import { BarcodeScanner } from "@/components/BarcodeScanner";

export function InventorySection() {
  const { 
    ingredients, 
    ingredientsLoading, 
    createIngredient, 
    createIngredientPending, 
    updateIngredient, 
    updateIngredientPending,
    deleteIngredient,
    deleteIngredientPending
  } = useIngredients();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
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
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-serif font-semibold">Inventory</h2>
        <p className="text-sm text-muted-foreground">
          Track ingredients, spot low stock early, and manage your bar inventory.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Ingredient Inventory</CardTitle>
          <CardDescription>
            Add, update, and manage your bar ingredients.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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

          {/* Mobile: Collapsible form */}
          <Collapsible open={addFormOpen} onOpenChange={setAddFormOpen} className="md:hidden">
            <CollapsibleTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-between"
                data-testid="button-toggle-add-form"
              >
                <span className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Ingredient
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${addFormOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="rounded-lg border p-3 space-y-3">
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
                    data-testid="mobile-button-add-ingredient"
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
                      setAddFormOpen(false);
                    }}
                    disabled={createIngredientPending || !newIngredient.name.trim()}
                  >
                    {createIngredientPending ? "Adding..." : "Add"}
                  </Button>
                  <Button
                    variant="outline"
                    data-testid="mobile-button-scan-to-add"
                    onClick={() => setScannerOpen(true)}
                  >
                    <ScanBarcode className="h-4 w-4 mr-1" />
                    Scan
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
              {/* Mobile view - compact card layout */}
              <div className="md:hidden space-y-2" data-testid="inventory-mobile-view">
                {filteredItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    {ingredients.length === 0 
                      ? "No ingredients yet. Tap \"Add Ingredient\" above."
                      : "No ingredients match your filters."}
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const isLow = item.onHand > 0 && item.onHand <= item.parLevel;
                    const isOut = item.onHand <= 0;
                    return (
                      <div 
                        key={item.id} 
                        className={`border rounded-lg p-2 ${isOut ? "border-destructive/50 bg-destructive/5" : isLow ? "border-warning/50 bg-warning/5" : ""}`}
                        data-testid={`mobile-ingredient-${item.id}`}
                      >
                        {/* Row 1: Name + Status Badge */}
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-sm truncate block">{item.name}</span>
                          </div>
                          <Badge
                            variant={isOut ? "destructive" : isLow ? "secondary" : "default"}
                            className="text-[10px] px-1.5 py-0 h-5 shrink-0"
                          >
                            {isOut ? "Out" : isLow ? "Low" : "OK"}
                          </Badge>
                        </div>

                        {/* Row 2: Category + Stock info */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                          <span className="truncate">{item.category || "Uncategorized"}</span>
                          <span>Par: {item.parLevel} {item.unit}</span>
                        </div>

                        {/* Row 3: Quick stock controls + actions */}
                        <div className="flex items-center justify-between gap-2">
                          {/* Quick stock adjustment */}
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => {
                                updateIngredient({
                                  id: item.id,
                                  onHand: Math.max(0, item.onHand - 1),
                                });
                              }}
                              disabled={updateIngredientPending || item.onHand <= 0}
                              data-testid={`mobile-button-decrement-${item.id}`}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <div 
                              className="min-w-[3.5rem] text-center font-medium text-sm px-1"
                              data-testid={`mobile-stock-count-${item.id}`}
                            >
                              {item.onHand} {item.unit}
                            </div>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => {
                                updateIngredient({
                                  id: item.id,
                                  onHand: item.onHand + 1,
                                });
                              }}
                              disabled={updateIngredientPending}
                              data-testid={`mobile-button-increment-${item.id}`}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>

                          {/* Edit + Delete actions */}
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => handleEditOpen(item.id)}
                              data-testid={`mobile-button-edit-ingredient-${item.id}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  data-testid={`mobile-button-delete-ingredient-${item.id}`}
                                  disabled={deleteIngredientPending}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
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
                          </div>
                        </div>
                      </div>
                    );
                  })
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
        <DialogContent>
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
