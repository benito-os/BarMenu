import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Boxes, Camera, ClipboardList, Sparkles } from "lucide-react";
import { useIngredients } from "@/hooks/useIngredients";

const scanLog = [
  {
    id: "scan-1",
    title: "Shelf scan completed",
    detail: "18 ingredients updated • 2 flagged as out of stock",
    time: "Today, 9:15 AM",
  },
  {
    id: "scan-2",
    title: "Back bar scan completed",
    detail: "12 ingredients updated • 3 flagged for reorder",
    time: "Yesterday, 6:52 PM",
  },
  {
    id: "scan-3",
    title: "Prep station scan completed",
    detail: "8 mixers updated • 1 flagged as low",
    time: "Yesterday, 11:03 AM",
  },
];

export default function InventoryPage() {
  const { ingredients, ingredientsLoading, createIngredient, createIngredientPending, updateIngredient, updateIngredientPending } = useIngredients();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
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
      onHand: target.onHand,
      parLevel: target.parLevel,
    });
    setEditingIngredientId(ingredientId);
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-full space-y-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-serif font-semibold">Inventory</h2>
          <p className="text-sm text-muted-foreground">
            Track every ingredient, spot low stock early, and sync Replit scans into your inventory log.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Ingredients</CardTitle>
              <Boxes className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{summary.total}</div>
              <p className="text-xs text-muted-foreground">Across all bar stations</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-3xl font-semibold">{summary.low}</div>
              <p className="text-xs text-muted-foreground">{summary.out} out of stock today</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Restock Urgency</CardTitle>
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-3xl font-semibold">{restockPercent}%</div>
              <Progress value={restockPercent} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {summary.healthy} ingredients are at healthy levels
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Ingredient Inventory</CardTitle>
              <CardDescription>
                Update counts manually or pair with Replit Functions for quick scans.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border p-4 space-y-3">
                <h3 className="text-sm font-semibold">Add Ingredient</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="ingredient-name">Name</Label>
                    <Input
                      id="ingredient-name"
                      value={newIngredient.name}
                      onChange={(event) => setNewIngredient(prev => ({ ...prev, name: event.target.value }))}
                      placeholder="Fresh Lime Juice"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ingredient-category">Category</Label>
                    <Input
                      id="ingredient-category"
                      value={newIngredient.category}
                      onChange={(event) => setNewIngredient(prev => ({ ...prev, category: event.target.value }))}
                      placeholder="Mixers"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ingredient-unit">Unit</Label>
                    <Input
                      id="ingredient-unit"
                      value={newIngredient.unit}
                      onChange={(event) => setNewIngredient(prev => ({ ...prev, unit: event.target.value }))}
                      placeholder="qt"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ingredient-par">Par Level</Label>
                    <Input
                      id="ingredient-par"
                      type="number"
                      value={newIngredient.parLevel}
                      onChange={(event) => setNewIngredient(prev => ({ ...prev, parLevel: Number(event.target.value) }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ingredient-on-hand">On Hand</Label>
                    <Input
                      id="ingredient-on-hand"
                      type="number"
                      value={newIngredient.onHand}
                      onChange={(event) => setNewIngredient(prev => ({ ...prev, onHand: Number(event.target.value) }))}
                    />
                  </div>
                </div>
                <Button
                  onClick={() => {
                    if (!newIngredient.name.trim()) return;
                    createIngredient(newIngredient);
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
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <Input
                  placeholder="Search ingredients"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="md:max-w-sm"
                />
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
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
                    <SelectTrigger className="w-full sm:w-[180px]">
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

              <div className="overflow-x-auto">
                {ingredientsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((row) => (
                      <Skeleton key={row} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
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
                          <TableRow key={item.id}>
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
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditOpen(item.id)}
                              >
                                Update
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {filteredItems.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            No ingredients match your filters.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Replit Function Scan</CardTitle>
                <CardDescription>
                  Use Replit Functions to scan shelves and log inventory updates automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-2">
                  <p className="font-semibold">Suggested setup</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Create a Replit Function named <span className="font-mono">scanInventory</span>.</li>
                    <li>Capture shelf photos and map labels to ingredient IDs.</li>
                    <li>POST updates to <span className="font-mono">/api/inventory/scan</span>.</li>
                  </ul>
                </div>
                <div className="flex flex-col gap-2">
                  <Button className="w-full">
                    <Camera className="mr-2 h-4 w-4" />
                    Trigger Replit Scan
                  </Button>
                  <Button variant="outline" className="w-full">
                    View integration checklist
                  </Button>
                </div>
                <div className="rounded-lg border p-4 text-xs text-muted-foreground font-mono">
                  {"POST /api/inventory/scan"}
                  <br />
                  {"{ \"source\": \"replit\", \"location\": \"back-bar\" }"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Recent Scan Log</CardTitle>
                <CardDescription>Latest updates captured by Replit Functions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {scanLog.map((scan) => (
                  <div key={scan.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{scan.title}</p>
                      <Badge variant="outline">Synced</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{scan.detail}</p>
                    <p className="text-xs text-muted-foreground mt-2">{scan.time}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        <Dialog open={!!editingIngredient} onOpenChange={(open) => !open && setEditingIngredientId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Inventory</DialogTitle>
              <DialogDescription>
                Adjust stock levels and par targets for this ingredient.
              </DialogDescription>
            </DialogHeader>
            {editingIngredient && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="edit-on-hand">On Hand</Label>
                  <Input
                    id="edit-on-hand"
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
                    type="number"
                    value={editForm.parLevel}
                    onChange={(event) => setEditForm(prev => ({
                      ...prev,
                      parLevel: Number(event.target.value),
                    }))}
                    disabled={updateIngredientPending}
                  />
                </div>
                <Button
                  onClick={() => {
                    updateIngredient({
                      id: editingIngredient.id,
                      onHand: editForm.onHand,
                      parLevel: editForm.parLevel,
                    });
                    setEditingIngredientId(null);
                  }}
                  disabled={updateIngredientPending}
                >
                  {updateIngredientPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  onClick={() => setEditingIngredientId(null)}
                  variant="outline"
                  disabled={updateIngredientPending}
                >
                  Done
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
