import { useState, useMemo, useCallback, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useDrinks } from "@/hooks/useDrinks";
import { useIngredients } from "@/hooks/useIngredients";
import { useMenus } from "@/hooks/useMenus";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import type { DrinkAvailability } from "@shared/validation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Pencil, CheckCircle2, AlertCircle, Ban, Undo2 } from "lucide-react";

export default function DrinksPage() {
  const [selectedMenuId, setSelectedMenuId] = useState<string>("");
  const [selectedDrinks, setSelectedDrinks] = useState<Set<string>>(new Set());
  const [localDrinks, setLocalDrinks] = useState<DrinkAvailability[]>([]);
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [editingDrink, setEditingDrink] = useState<DrinkAvailability | null>(null);
  const [newDrink, setNewDrink] = useState({
    menuId: "",
    name: "",
    section: "",
    description: "",
    recipe: "",
    style: "",
    temperature: "",
    baseSpirit: "",
    isMocktail: false,
    canBeMocktail: false,
    isStirred: false,
    isShaken: false,
    isActive: true,
    isOutOfStock: false,
    sortOrder: 0,
    ingredientIds: [] as string[],
  });

  const { menus, menusLoading, defaultMenu } = useMenus(true);
  const { ingredients, ingredientsLoading } = useIngredients();
  const {
    drinks: allDrinks,
    drinksLoading: allDrinksLoading,
    createDrink,
    createDrinkPending,
    updateDrink,
    updateDrinkPending,
    reorderDrinks,
    bulkDelete,
    bulkDeletePending,
    bulkUpdate,
    bulkUpdatePending,
  } = useDrinks(selectedMenuId, !!selectedMenuId);

  // Set default menu
  useEffect(() => {
    if (!selectedMenuId && !menusLoading && defaultMenu) {
      setSelectedMenuId(defaultMenu.id);
      setNewDrink(prev => ({
        ...prev,
        menuId: prev.menuId || defaultMenu.id,
        sortOrder: prev.menuId ? prev.sortOrder : getNextSortOrder(defaultMenu.id),
      }));
    }
  }, [defaultMenu, menusLoading, selectedMenuId]);

  // Update localDrinks when allDrinks changes
  useEffect(() => {
    if (allDrinks) {
      const sorted = [...allDrinks].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      setLocalDrinks(sorted);
    } else if (selectedMenuId) {
      setLocalDrinks([]);
    }
  }, [allDrinks, selectedMenuId]);

  // Reset filters when menu changes
  useEffect(() => {
    setSectionFilter("all");
    setSelectedDrinks(new Set());
  }, [selectedMenuId]);

  // Auto-update sortOrder when menuId changes in newDrink
  useEffect(() => {
    if (newDrink.menuId) {
      setNewDrink(prev => ({
        ...prev,
        sortOrder: getNextSortOrder(prev.menuId),
      }));
    }
  }, [newDrink.menuId]);

  const getNextSortOrder = useCallback((menuId: string) => {
    if (!menuId) return 0;
    const drinksForMenu = localDrinks?.filter(drink => drink.menuId === menuId) || [];
    const maxSortOrder = drinksForMenu.reduce((max, drink) => Math.max(max, drink.sortOrder || 0), 0);
    return maxSortOrder + 1;
  }, [localDrinks]);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Section utilities
  const getSectionKey = (section?: string | null) => section?.trim() || "Uncategorized";

  const selectedMenu = useMemo(() => menus?.find(menu => menu.id === selectedMenuId), [menus, selectedMenuId]);

  const sectionOrder = useMemo(() => {
    const fromMenu = selectedMenu?.sections?.map(section => getSectionKey(section)) || [];
    const fromDrinks = localDrinks.map(drink => getSectionKey(drink.section));
    return Array.from(new Set([...fromMenu, ...fromDrinks]));
  }, [localDrinks, selectedMenu?.sections]);

  const sectionedDrinks = useMemo(() => {
    const entries = new Map<string, DrinkAvailability[]>();
    sectionOrder.forEach(section => entries.set(section, []));

    localDrinks.forEach(drink => {
      const key = getSectionKey(drink.section);
      if (!entries.has(key)) entries.set(key, []);
      entries.get(key)!.push(drink);
    });

    entries.forEach((drinks, key) => {
      entries.set(
        key,
        [...drinks].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      );
    });

    return entries;
  }, [localDrinks, sectionOrder]);

  const filteredSectionOrder = useMemo(
    () => (sectionFilter === "all" ? sectionOrder : sectionOrder.filter(section => section === sectionFilter)),
    [sectionFilter, sectionOrder]
  );

  const filteredDrinks = useMemo(
    () => filteredSectionOrder.flatMap(section => sectionedDrinks.get(section) || []),
    [filteredSectionOrder, sectionedDrinks]
  );

  const handleSectionDragEnd = (sectionKey: string) => (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const sectionDrinks = sectionedDrinks.get(sectionKey) || [];
    const oldIndex = sectionDrinks.findIndex(d => d.id === active.id);
    const newIndex = sectionDrinks.findIndex(d => d.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      console.error("Could not find drink indices for reorder in section", sectionKey);
      return;
    }

    const reorderedSection = arrayMove(sectionDrinks, oldIndex, newIndex);
    const updatedSections = new Map(sectionedDrinks);
    updatedSections.set(sectionKey, reorderedSection);

    const recombined = sectionOrder.flatMap(section => updatedSections.get(section) || []);
    const updates = recombined.map((drink, index) => ({
      id: drink.id,
      sortOrder: index,
    }));

    setLocalDrinks(recombined);
    reorderDrinks(updates);
  };

  // Toggle drink selection
  const toggleDrinkSelection = (drinkId: string) => {
    const newSelection = new Set(selectedDrinks);
    if (newSelection.has(drinkId)) {
      newSelection.delete(drinkId);
    } else {
      newSelection.add(drinkId);
    }
    setSelectedDrinks(newSelection);
  };

  // Select all or deselect all
  const toggleSelectAll = () => {
    if (selectedDrinks.size === filteredDrinks.length) {
      setSelectedDrinks(new Set());
    } else {
      setSelectedDrinks(new Set(filteredDrinks.map(d => d.id)));
    }
  };

  // Clean up selections when filtered drinks change
  useEffect(() => {
    setSelectedDrinks(prev => {
      const visibleIds = new Set(filteredDrinks.map(d => d.id));
      return new Set(Array.from(prev).filter(id => visibleIds.has(id)));
    });
  }, [filteredDrinks, sectionFilter, selectedMenuId]);

  // Sortable Drink Item Component
  function SortableDrinkItem({ drink }: { drink: DrinkAvailability }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: drink.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <Card
        ref={setNodeRef}
        style={style}
        className="hover-elevate cursor-pointer"
        onClick={() => toggleDrinkSelection(drink.id)}
        data-testid={`drink-item-${drink.id}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="font-serif text-lg line-clamp-1">{drink.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {drink.section && (
                  <Badge variant="secondary" className="text-xs">{drink.section}</Badge>
                )}
                {!drink.isActive && (
                  <Badge variant="outline" className="text-xs">Inactive</Badge>
                )}
                {drink.isOutOfStock && (
                  <Badge variant="destructive" className="text-xs">Out of stock</Badge>
                )}
                {drink.missingIngredients.length > 0 && (
                  <Badge variant="secondary" className="text-xs">Missing ingredients</Badge>
                )}
              </div>
            </div>
            <Checkbox
              checked={selectedDrinks.has(drink.id)}
              onCheckedChange={() => {
                toggleDrinkSelection(drink.id);
              }}
              onClick={(e) => e.stopPropagation()}
              data-testid={`checkbox-drink-${drink.id}`}
            />
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          {drink.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {drink.description}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {drink.style && (
              <Badge variant="outline" className="text-xs">{drink.style}</Badge>
            )}
            {drink.baseSpirit && (
              <Badge variant="outline" className="text-xs">{drink.baseSpirit}</Badge>
            )}
            {drink.temperature && (
              <Badge variant="outline" className="text-xs">{drink.temperature}</Badge>
            )}
            {drink.isMocktail && (
              <Badge variant="outline" className="text-xs">Non-Alcoholic</Badge>
            )}
            {drink.canBeMocktail && (
              <Badge variant="outline" className="text-xs">Mocktail Available</Badge>
            )}
            {drink.isStirred && (
              <Badge variant="outline" className="text-xs">Stirred</Badge>
            )}
            {drink.isShaken && (
              <Badge variant="outline" className="text-xs">Shaken</Badge>
            )}
          </div>
          <div className="flex gap-2 mt-3 pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setEditingDrink(drink);
              }}
              data-testid={`button-edit-drink-${drink.id}`}
            >
              <Pencil className="w-3 h-3 mr-1" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete "${drink.name}"? This cannot be undone.`)) {
                  bulkDelete([drink.id]);
                }
              }}
              disabled={bulkDeletePending}
              data-testid={`button-delete-drink-${drink.id}`}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Delete
            </Button>
            <Button
              variant={drink.isOutOfStock ? "default" : "outline"}
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                updateDrink({ ...drink, isOutOfStock: !drink.isOutOfStock });
              }}
              disabled={updateDrinkPending}
              data-testid={`button-86-drink-${drink.id}`}
            >
              {drink.isOutOfStock ? (
                <>
                  <Undo2 className="w-3 h-3 mr-1" />
                  Restock
                </>
              ) : (
                <>
                  <Ban className="w-3 h-3 mr-1" />
                  86
                </>
              )}
            </Button>
            <div className="flex-1" />
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleCreateDrink = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDrink.menuId && newDrink.name) {
      createDrink(newDrink);
      // Reset form after successful creation
      setNewDrink({
        menuId: newDrink.menuId,
        name: "",
        section: "",
        description: "",
        recipe: "",
        style: "",
        temperature: "",
        baseSpirit: "",
        isMocktail: false,
        canBeMocktail: false,
        isStirred: false,
        isShaken: false,
        isActive: true,
        isOutOfStock: false,
        sortOrder: getNextSortOrder(newDrink.menuId),
        ingredientIds: [],
      });
    }
  };

  const handleUpdateDrink = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDrink) {
      updateDrink(editingDrink);
      setEditingDrink(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-full space-y-4">
        {/* Create Drink Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Create New Drink</CardTitle>
            <CardDescription>
              Add a new drink to one of your menus
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateDrink} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="drink-menu">Menu</Label>
                  <Select
                    value={newDrink.menuId}
                    onValueChange={(value) => setNewDrink(prev => ({
                      ...prev,
                      menuId: value,
                      sortOrder: getNextSortOrder(value),
                    }))}
                    disabled={createDrinkPending || menusLoading || !menus || menus.length === 0}
                  >
                    <SelectTrigger id="drink-menu" data-testid="select-drink-menu">
                      <SelectValue placeholder="Select a menu" />
                    </SelectTrigger>
                    <SelectContent>
                      {menus?.map((menu) => (
                        <SelectItem key={menu.id} value={menu.id}>
                          {menu.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="drink-name">Drink Name</Label>
                  <Input
                    id="drink-name"
                    value={newDrink.name}
                    onChange={(e) => setNewDrink({ ...newDrink, name: e.target.value })}
                    placeholder="Midnight Martini"
                    disabled={createDrinkPending}
                    data-testid="input-drink-name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="drink-section">Section</Label>
                  {(() => {
                    const selectedMenu = menus?.find(m => m.id === newDrink.menuId);
                    const menuSections = selectedMenu?.sections || [];
                    return (
                      <Select
                        value={newDrink.section || "not_specified"}
                        onValueChange={(value) => setNewDrink({ ...newDrink, section: value === "not_specified" ? "" : value })}
                        disabled={createDrinkPending || !newDrink.menuId}
                      >
                        <SelectTrigger id="drink-section" data-testid="select-drink-section">
                          <SelectValue placeholder="Select section" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_specified">Not Specified</SelectItem>
                          {menuSections.map((section, idx) => (
                            <SelectItem key={idx} value={section}>{section}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  })()}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="drink-style">Style</Label>
                  <Input
                    id="drink-style"
                    value={newDrink.style}
                    onChange={(e) => setNewDrink({ ...newDrink, style: e.target.value })}
                    placeholder="Dry, Boozy"
                    disabled={createDrinkPending}
                    data-testid="input-drink-style"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="drink-description">Description</Label>
                <Textarea
                  id="drink-description"
                  value={newDrink.description}
                  onChange={(e) => setNewDrink({ ...newDrink, description: e.target.value })}
                  placeholder="A classic martini with a twist..."
                  rows={2}
                  disabled={createDrinkPending}
                  data-testid="input-drink-description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="drink-recipe">Recipe / Instructions</Label>
                <Textarea
                  id="drink-recipe"
                  value={newDrink.recipe}
                  onChange={(e) => setNewDrink({ ...newDrink, recipe: e.target.value })}
                  placeholder="2 oz gin, 0.5 oz dry vermouth, stir with ice..."
                  rows={3}
                  disabled={createDrinkPending}
                  data-testid="input-drink-recipe"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="drink-base">Base Spirit</Label>
                  <Input
                    id="drink-base"
                    value={newDrink.baseSpirit}
                    onChange={(e) => setNewDrink({ ...newDrink, baseSpirit: e.target.value })}
                    placeholder="Gin"
                    disabled={createDrinkPending}
                    data-testid="input-drink-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="drink-temperature">Temperature</Label>
                  <Select
                    value={newDrink.temperature || "not_specified"}
                    onValueChange={(value) => setNewDrink({ ...newDrink, temperature: value === "not_specified" ? "" : value })}
                    disabled={createDrinkPending}
                  >
                    <SelectTrigger id="drink-temperature" data-testid="select-drink-temperature">
                      <SelectValue placeholder="Select temperature" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_specified">Not Specified</SelectItem>
                      <SelectItem value="hot">Hot</SelectItem>
                      <SelectItem value="cold">Cold</SelectItem>
                      <SelectItem value="room_temp">Room Temperature</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="drink-mocktail"
                    checked={newDrink.isMocktail}
                    onCheckedChange={(checked) => setNewDrink({ ...newDrink, isMocktail: checked })}
                    disabled={createDrinkPending}
                    data-testid="switch-drink-mocktail"
                  />
                  <Label htmlFor="drink-mocktail" className="text-sm">Non-Alcoholic</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="drink-can-be-mocktail"
                    checked={newDrink.canBeMocktail}
                    onCheckedChange={(checked) => setNewDrink({ ...newDrink, canBeMocktail: checked })}
                    disabled={createDrinkPending}
                    data-testid="switch-drink-can-be-mocktail"
                  />
                  <Label htmlFor="drink-can-be-mocktail" className="text-sm">Mocktail Available</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="drink-stirred"
                    checked={newDrink.isStirred}
                    onCheckedChange={(checked) => setNewDrink({ ...newDrink, isStirred: checked })}
                    disabled={createDrinkPending}
                    data-testid="switch-drink-stirred"
                  />
                  <Label htmlFor="drink-stirred" className="text-sm">Stirred</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="drink-shaken"
                    checked={newDrink.isShaken}
                    onCheckedChange={(checked) => setNewDrink({ ...newDrink, isShaken: checked })}
                    disabled={createDrinkPending}
                    data-testid="switch-drink-shaken"
                  />
                  <Label htmlFor="drink-shaken" className="text-sm">Shaken</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="drink-active"
                    checked={newDrink.isActive}
                    onCheckedChange={(checked) => setNewDrink({ ...newDrink, isActive: checked })}
                    disabled={createDrinkPending}
                    data-testid="switch-drink-active"
                  />
                  <Label htmlFor="drink-active" className="text-sm">Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="drink-out-of-stock"
                    checked={newDrink.isOutOfStock}
                    onCheckedChange={(checked) => setNewDrink({ ...newDrink, isOutOfStock: checked })}
                    disabled={createDrinkPending}
                    data-testid="switch-drink-out-of-stock"
                  />
                  <Label htmlFor="drink-out-of-stock" className="text-sm">Out of Stock</Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="drink-order" className="text-sm">Sort Order</Label>
                  <Input
                    id="drink-order"
                    type="number"
                    value={newDrink.sortOrder}
                    onChange={(e) => setNewDrink({ ...newDrink, sortOrder: parseInt(e.target.value) || 0 })}
                    disabled={createDrinkPending}
                    data-testid="input-drink-order"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Ingredients</Label>
                <div className="rounded-md border p-3">
                  {ingredientsLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((row) => (
                        <Skeleton key={row} className="h-5 w-full" />
                      ))}
                    </div>
                  ) : ingredients.length > 0 ? (
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {ingredients.map((ingredient) => (
                        <label key={ingredient.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={newDrink.ingredientIds.includes(ingredient.id)}
                            onCheckedChange={(checked) => {
                              setNewDrink((prev) => ({
                                ...prev,
                                ingredientIds: checked
                                  ? [...prev.ingredientIds, ingredient.id]
                                  : prev.ingredientIds.filter((id) => id !== ingredient.id),
                              }));
                            }}
                          />
                          <span>{ingredient.name}</span>
                          {ingredient.onHand <= 0 && (
                            <Badge variant="destructive" className="text-[10px]">Out</Badge>
                          )}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Add ingredients in Inventory to assign them.</p>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                disabled={createDrinkPending || !newDrink.menuId || !newDrink.name.trim()}
                data-testid="button-create-drink"
              >
                {createDrinkPending ? "Creating..." : "Create Drink"}
              </Button>
              {!menus || menus.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-2">
                  Please create a menu first before adding drinks
                </p>
              ) : null}
            </form>
          </CardContent>
        </Card>

        {/* Manage Drinks Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Manage Drinks</CardTitle>
            <CardDescription>
              Reorder drinks, activate/deactivate, or bulk delete
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Menu Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="manage-menu">Select Menu</Label>
                {defaultMenu && (
                  <Badge variant="outline" className="text-xs font-normal" data-testid="badge-default-menu">
                    Default: {defaultMenu.name}
                    {defaultMenu.isActive ? " (Active)" : ""}
                  </Badge>
                )}
              </div>
              <Select
                value={selectedMenuId || undefined}
                onValueChange={(value) => {
                  setSelectedMenuId(value);
                  setSelectedDrinks(new Set());
                  setSectionFilter("all");
                  setLocalDrinks([]);
                  setNewDrink(prev => ({
                    ...prev,
                    menuId: value,
                    sortOrder: getNextSortOrder(value),
                  }));
                }}
                disabled={menusLoading || !menus || menus.length === 0}
              >
                <SelectTrigger id="manage-menu" data-testid="select-manage-menu">
                  <SelectValue placeholder="Choose a menu to manage" />
                </SelectTrigger>
                <SelectContent>
                  {menus?.map((menu) => (
                    <SelectItem key={menu.id} value={menu.id}>
                      {menu.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedMenuId && (
              <>
                {sectionOrder.length > 0 && (
                  <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="section-filter">Section Filter</Label>
                      <p className="text-sm text-muted-foreground">
                        Drag-and-drop and bulk actions apply to the selected section scope.
                      </p>
                    </div>
                    <Select
                      value={sectionFilter}
                      onValueChange={(value) => {
                        setSectionFilter(value);
                        setSelectedDrinks(new Set());
                      }}
                    >
                      <SelectTrigger id="section-filter" className="w-full md:w-64" data-testid="select-section-filter">
                        <SelectValue placeholder="Choose a section" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sections</SelectItem>
                        {sectionOrder.map(section => (
                          <SelectItem key={section} value={section}>
                            {section}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Sticky Bulk Actions Bar */}
                {filteredDrinks.length > 0 && (
                  <div className="sticky top-0 z-50 bg-background pb-4">
                    <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/20">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleSelectAll}
                        data-testid="button-toggle-select-all"
                      >
                        {selectedDrinks.size === filteredDrinks.length ? "Deselect All" : "Select All"}
                      </Button>
                      
                      {selectedDrinks.size > 0 && (
                        <>
                          <div className="text-sm text-muted-foreground">
                            {selectedDrinks.size} selected
                          </div>
                          <div className="flex-1" />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              bulkUpdate({
                                drinkIds: Array.from(selectedDrinks),
                                isActive: true,
                              });
                            }}
                            disabled={bulkUpdatePending}
                            data-testid="button-bulk-activate"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Activate
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              bulkUpdate({
                                drinkIds: Array.from(selectedDrinks),
                                isActive: false,
                              });
                            }}
                            disabled={bulkUpdatePending}
                            data-testid="button-bulk-deactivate"
                          >
                            <AlertCircle className="w-4 h-4 mr-1" />
                            Deactivate
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Delete ${selectedDrinks.size} drink(s)? This cannot be undone.`)) {
                                bulkDelete(Array.from(selectedDrinks));
                              }
                            }}
                            disabled={bulkDeletePending}
                            data-testid="button-bulk-delete"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Drinks Grid with Drag and Drop */}
                {allDrinksLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Skeleton key={i} className="h-64 w-full" />
                    ))}
                  </div>
                ) : filteredSectionOrder.length > 0 && filteredDrinks.length > 0 ? (
                  <div className="space-y-8" data-testid="drinks-list">
                    {filteredSectionOrder.map(section => {
                      const drinks = sectionedDrinks.get(section) || [];

                      return (
                        <div key={section} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-lg">{section}</h4>
                              <Badge variant="outline" className="text-xs">
                                {drinks.length} {drinks.length === 1 ? "drink" : "drinks"}
                              </Badge>
                            </div>
                          </div>

                          {drinks.length > 0 ? (
                            <DndContext
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              onDragEnd={handleSectionDragEnd(section)}
                            >
                              <SortableContext
                                items={drinks.map(d => d.id)}
                                strategy={verticalListSortingStrategy}
                              >
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {drinks.map((drink) => (
                                    <SortableDrinkItem key={drink.id} drink={drink} />
                                  ))}
                                </div>
                              </SortableContext>
                            </DndContext>
                          ) : (
                            <p className="text-sm text-muted-foreground">No drinks in this section.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No drinks match this section. Create drinks above or change the filter.
                  </p>
                )}
              </>
            )}

            {!selectedMenuId && !menusLoading && menus && menus.length > 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Select a menu to manage its drinks
              </p>
            )}

            {!menus || menus.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Create a menu first before managing drinks
              </p>
            ) : null}
          </CardContent>
        </Card>

        {/* Edit Drink Dialog */}
        <Dialog open={!!editingDrink} onOpenChange={(open) => !open && setEditingDrink(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <DialogHeader className="flex-shrink-0 pb-2">
              <DialogTitle>Edit Drink</DialogTitle>
              <DialogDescription>
                Update drink information and settings
              </DialogDescription>
            </DialogHeader>
            {editingDrink && (
              <form
                onSubmit={handleUpdateDrink}
                className="flex flex-col flex-1 min-h-0"
              >
                <div className="flex-1 min-h-0 overflow-hidden">
                  <ScrollArea className="h-full pr-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-drink-name">Drink Name</Label>
                        <Input
                          id="edit-drink-name"
                          value={editingDrink.name}
                          onChange={(e) => setEditingDrink({ ...editingDrink, name: e.target.value })}
                          placeholder="Midnight Martini"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-drink-menu">Menu</Label>
                        <Select
                          value={editingDrink.menuId || "not_specified"}
                          onValueChange={(value) => {
                            const nextMenuId = value === "not_specified" ? "" : value;
                            const targetMenu = menus?.find(m => m.id === nextMenuId);
                            const targetSections = targetMenu?.sections || [];

                            setEditingDrink(prev => {
                              if (!prev) return prev;
                              const shouldResetSection = prev.section && !targetSections.includes(prev.section);
                              const nextSection = shouldResetSection ? "" : prev.section;
                              return {
                                ...prev,
                                menuId: nextMenuId,
                                section: nextSection,
                                sortOrder: nextMenuId ? getNextSortOrder(nextMenuId) : prev.sortOrder,
                              };
                            });
                          }}
                        >
                          <SelectTrigger id="edit-drink-menu" data-testid="select-edit-drink-menu">
                            <SelectValue placeholder="Select menu" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not_specified">Not Specified</SelectItem>
                            {(menus || []).map(menu => (
                              <SelectItem key={menu.id} value={menu.id}>
                                {menu.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-drink-section">Section</Label>
                        {(() => {
                          const drinkMenu = menus?.find(m => m.id === editingDrink.menuId);
                          const menuSections = drinkMenu?.sections || [];
                          const currentSection = editingDrink.section;
                          const allSections = currentSection && !menuSections.includes(currentSection)
                            ? [currentSection, ...menuSections]
                            : menuSections;
                          return (
                            <Select
                              value={editingDrink.section || "not_specified"}
                              onValueChange={(value) => setEditingDrink({ ...editingDrink, section: value === "not_specified" ? "" : value })}
                            >
                              <SelectTrigger id="edit-drink-section" data-testid="select-edit-drink-section">
                                <SelectValue placeholder="Select section" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="not_specified">Not Specified</SelectItem>
                                {allSections.map((section, idx) => (
                                  <SelectItem key={idx} value={section}>
                                    {section}
                                    {currentSection === section && !menuSections.includes(section) && " (legacy)"}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-drink-style">Style</Label>
                      <Input
                        id="edit-drink-style"
                        value={editingDrink.style || ""}
                        onChange={(e) => setEditingDrink({ ...editingDrink, style: e.target.value })}
                        placeholder="Dry, Boozy"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-drink-description">Description</Label>
                      <Textarea
                        id="edit-drink-description"
                        value={editingDrink.description || ""}
                        onChange={(e) => setEditingDrink({ ...editingDrink, description: e.target.value })}
                        placeholder="A classic martini with a twist..."
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-drink-recipe">Recipe / Instructions</Label>
                      <Textarea
                        id="edit-drink-recipe"
                        value={editingDrink.recipe || ""}
                        onChange={(e) => setEditingDrink({ ...editingDrink, recipe: e.target.value })}
                        placeholder="2 oz gin, 0.5 oz dry vermouth, stir with ice..."
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-drink-base">Base Spirit</Label>
                        <Input
                          id="edit-drink-base"
                          value={editingDrink.baseSpirit || ""}
                          onChange={(e) => setEditingDrink({ ...editingDrink, baseSpirit: e.target.value })}
                          placeholder="Gin"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-drink-temperature">Temperature</Label>
                        <Select
                          value={editingDrink.temperature || "not_specified"}
                          onValueChange={(value) => setEditingDrink({ ...editingDrink, temperature: value === "not_specified" ? "" : value })}
                        >
                          <SelectTrigger id="edit-drink-temperature">
                            <SelectValue placeholder="Select temperature" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not_specified">Not Specified</SelectItem>
                            <SelectItem value="hot">Hot</SelectItem>
                            <SelectItem value="cold">Cold</SelectItem>
                            <SelectItem value="room_temp">Room Temperature</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="edit-drink-mocktail"
                          checked={editingDrink.isMocktail}
                          onCheckedChange={(checked) => setEditingDrink({ ...editingDrink, isMocktail: checked })}
                        />
                        <Label htmlFor="edit-drink-mocktail" className="text-sm">Non-Alcoholic</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="edit-drink-can-be-mocktail"
                          checked={editingDrink.canBeMocktail}
                          onCheckedChange={(checked) => setEditingDrink({ ...editingDrink, canBeMocktail: checked })}
                        />
                        <Label htmlFor="edit-drink-can-be-mocktail" className="text-sm">Mocktail Available</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="edit-drink-stirred"
                          checked={editingDrink.isStirred}
                          onCheckedChange={(checked) => setEditingDrink({ ...editingDrink, isStirred: checked })}
                        />
                        <Label htmlFor="edit-drink-stirred" className="text-sm">Stirred</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="edit-drink-shaken"
                          checked={editingDrink.isShaken}
                          onCheckedChange={(checked) => setEditingDrink({ ...editingDrink, isShaken: checked })}
                        />
                        <Label htmlFor="edit-drink-shaken" className="text-sm">Shaken</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="edit-drink-active"
                          checked={editingDrink.isActive}
                          onCheckedChange={(checked) => setEditingDrink({ ...editingDrink, isActive: checked })}
                        />
                        <Label htmlFor="edit-drink-active" className="text-sm">Active</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="edit-drink-out-of-stock"
                          checked={editingDrink.isOutOfStock}
                          onCheckedChange={(checked) => setEditingDrink({ ...editingDrink, isOutOfStock: checked })}
                        />
                        <Label htmlFor="edit-drink-out-of-stock" className="text-sm">Out of Stock</Label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Ingredients</Label>
                      <div className="rounded-md border p-3">
                        {ingredientsLoading ? (
                          <div className="space-y-2">
                            {[1, 2, 3].map((row) => (
                              <Skeleton key={row} className="h-5 w-full" />
                            ))}
                          </div>
                        ) : ingredients.length > 0 ? (
                          <div className="max-h-48 overflow-y-auto space-y-2">
                            {ingredients.map((ingredient) => (
                              <label key={ingredient.id} className="flex items-center gap-2 text-sm">
                                <Checkbox
                                  checked={editingDrink.ingredientIds.includes(ingredient.id)}
                                  onCheckedChange={(checked) => {
                                    setEditingDrink((prev) => {
                                      if (!prev) return prev;
                                      return {
                                        ...prev,
                                        ingredientIds: checked
                                          ? [...prev.ingredientIds, ingredient.id]
                                          : prev.ingredientIds.filter((id) => id !== ingredient.id),
                                      };
                                    });
                                  }}
                                />
                                <span>{ingredient.name}</span>
                                {ingredient.onHand <= 0 && (
                                  <Badge variant="destructive" className="text-[10px]">Out</Badge>
                                )}
                              </label>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Add ingredients in Inventory to assign them.</p>
                        )}
                      </div>
                    </div>
                  </div>
                  </ScrollArea>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingDrink(null)}
                    disabled={updateDrinkPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateDrinkPending || !editingDrink.name.trim()}
                  >
                    {updateDrinkPending ? "Updating..." : "Update Drink"}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
