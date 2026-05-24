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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { drinkCreateSchema, drinkUpdateSchema } from "@shared/validation";
import type { DrinkAvailability, InsertDrink } from "@shared/validation";
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
import { GripVertical, Trash2, Pencil, CheckCircle2, AlertCircle, Ban, Undo2, Copy } from "lucide-react";

// Small wrapper for the boolean switch rows so we don't repeat the same
// FormField + Switch + Label boilerplate six times per form.
function DrinkBoolField({
  control,
  name,
  label,
  testId,
  disabled,
}: {
  control: ReturnType<typeof useForm<InsertDrink>>["control"];
  name: "isMocktail" | "canBeMocktail" | "isStirred" | "isShaken" | "isActive" | "isOutOfStock";
  label: string;
  testId: string;
  disabled?: boolean;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-row items-center gap-2 space-y-0">
          <FormControl>
            <Switch
              checked={!!field.value}
              onCheckedChange={field.onChange}
              disabled={disabled}
              data-testid={testId}
            />
          </FormControl>
          <FormLabel className="text-sm cursor-pointer">{label}</FormLabel>
        </FormItem>
      )}
    />
  );
}

export default function DrinksPage() {
  const [selectedMenuId, setSelectedMenuId] = useState<string>("");
  const [selectedDrinks, setSelectedDrinks] = useState<Set<string>>(new Set());
  const [localDrinks, setLocalDrinks] = useState<DrinkAvailability[]>([]);
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [editingDrink, setEditingDrink] = useState<DrinkAvailability | null>(null);

  // Create form values. These match InsertDrink so the resolver / submit
  // payload line up exactly with the schema in shared/validation.
  const defaultCreateValues: InsertDrink = {
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
    ingredientIds: [],
  };

  const createForm = useForm<InsertDrink>({
    resolver: zodResolver(drinkCreateSchema),
    defaultValues: defaultCreateValues,
  });

  const editForm = useForm<InsertDrink>({
    resolver: zodResolver(drinkUpdateSchema),
    defaultValues: defaultCreateValues,
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
    duplicateDrink,
    duplicateDrinkPending,
    bulkUpdate,
    bulkUpdatePending,
  } = useDrinks(selectedMenuId, !!selectedMenuId);

  // Set default menu, and seed the create form's menuId once menus load.
  useEffect(() => {
    if (!selectedMenuId && !menusLoading && defaultMenu) {
      setSelectedMenuId(defaultMenu.id);
      const current = createForm.getValues();
      if (!current.menuId) {
        createForm.setValue("menuId", defaultMenu.id);
        createForm.setValue("sortOrder", getNextSortOrder(defaultMenu.id));
      }
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

  // Watch the create form's menuId so we can refresh sortOrder (and reset the
  // section if the new menu doesn't have the old one) when it changes.
  const createMenuId = createForm.watch("menuId");
  useEffect(() => {
    if (createMenuId) {
      createForm.setValue("sortOrder", getNextSortOrder(createMenuId));
      const currentSection = createForm.getValues("section");
      const newMenu = menus?.find((m) => m.id === createMenuId);
      const newSections = newMenu?.sections || [];
      if (currentSection && !newSections.includes(currentSection)) {
        createForm.setValue("section", "");
      }
    }
  }, [createMenuId]);

  // When the edit dialog opens for a different drink, reset the form to that
  // drink's values so the inputs reflect what's being edited.
  useEffect(() => {
    if (editingDrink) {
      editForm.reset({
        menuId: editingDrink.menuId,
        name: editingDrink.name,
        section: editingDrink.section,
        description: editingDrink.description ?? "",
        recipe: editingDrink.recipe ?? "",
        style: editingDrink.style ?? "",
        temperature: editingDrink.temperature ?? "",
        baseSpirit: editingDrink.baseSpirit ?? "",
        isMocktail: editingDrink.isMocktail,
        canBeMocktail: editingDrink.canBeMocktail,
        isStirred: editingDrink.isStirred,
        isShaken: editingDrink.isShaken,
        isActive: editingDrink.isActive,
        isOutOfStock: editingDrink.isOutOfStock,
        sortOrder: editingDrink.sortOrder,
        ingredientIds: editingDrink.ingredientIds ?? [],
      });
    }
  }, [editingDrink]);

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
                duplicateDrink(drink.id);
              }}
              disabled={duplicateDrinkPending}
              data-testid={`button-duplicate-drink-${drink.id}`}
            >
              <Copy className="w-3 h-3 mr-1" />
              Duplicate
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

  const handleCreateDrink = createForm.handleSubmit((data) => {
    createDrink(data);
    // Reset to defaults but keep the selected menu so the bartender can keep
    // adding drinks to the same menu without re-picking it.
    const menuId = data.menuId;
    createForm.reset({
      ...defaultCreateValues,
      menuId,
      sortOrder: getNextSortOrder(menuId),
    });
  });

  const handleUpdateDrink = editForm.handleSubmit((data) => {
    if (!editingDrink) return;
    // updateDrink hook expects a DrinkAvailability — merge form values onto the
    // original drink so we preserve id and any derived availability fields.
    updateDrink({ ...editingDrink, ...data });
    setEditingDrink(null);
  });

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
            <Form {...createForm}>
              <form onSubmit={handleCreateDrink} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="menuId"
                    render={({ field }) => {
                      const noMenus = !menus || menus.length === 0;
                      return (
                        <FormItem>
                          <FormLabel>Menu <span className="text-destructive">*</span></FormLabel>
                          <Select
                            value={field.value || ""}
                            onValueChange={field.onChange}
                            disabled={createDrinkPending || menusLoading || noMenus}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-drink-menu">
                                <SelectValue placeholder="Select a menu" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {menus?.map((menu) => (
                                <SelectItem key={menu.id} value={menu.id}>
                                  {menu.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  <FormField
                    control={createForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Drink Name <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Midnight Martini"
                            disabled={createDrinkPending}
                            data-testid="input-drink-name"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="section"
                    render={({ field }) => {
                      const selectedMenu = menus?.find((m) => m.id === createMenuId);
                      const menuSections = selectedMenu?.sections || [];
                      return (
                        <FormItem>
                          <FormLabel>Section <span className="text-destructive">*</span></FormLabel>
                          <Select
                            value={field.value || "not_specified"}
                            onValueChange={(value) =>
                              field.onChange(value === "not_specified" ? "" : value)
                            }
                            disabled={createDrinkPending || !createMenuId}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-drink-section">
                                <SelectValue placeholder="Select section" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="not_specified">Not Specified</SelectItem>
                              {menuSections.map((section, idx) => (
                                <SelectItem key={idx} value={section}>
                                  {section}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  <FormField
                    control={createForm.control}
                    name="style"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Style</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Dry, Boozy"
                            disabled={createDrinkPending}
                            data-testid="input-drink-style"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={createForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="A classic martini with a twist..."
                          rows={2}
                          disabled={createDrinkPending}
                          data-testid="input-drink-description"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="recipe"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recipe / Instructions</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="2 oz gin, 0.5 oz dry vermouth, stir with ice..."
                          rows={3}
                          disabled={createDrinkPending}
                          data-testid="input-drink-recipe"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="baseSpirit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Spirit</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Gin"
                            disabled={createDrinkPending}
                            data-testid="input-drink-base"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="temperature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Temperature</FormLabel>
                        <Select
                          value={field.value || "not_specified"}
                          onValueChange={(value) =>
                            field.onChange(value === "not_specified" ? "" : value)
                          }
                          disabled={createDrinkPending}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-drink-temperature">
                              <SelectValue placeholder="Select temperature" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="not_specified">Not Specified</SelectItem>
                            <SelectItem value="hot">Hot</SelectItem>
                            <SelectItem value="cold">Cold</SelectItem>
                            <SelectItem value="room_temp">Room Temperature</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <DrinkBoolField control={createForm.control} name="isMocktail" label="Non-Alcoholic" testId="switch-drink-mocktail" disabled={createDrinkPending} />
                  <DrinkBoolField control={createForm.control} name="canBeMocktail" label="Mocktail Available" testId="switch-drink-can-be-mocktail" disabled={createDrinkPending} />
                  <DrinkBoolField control={createForm.control} name="isStirred" label="Stirred" testId="switch-drink-stirred" disabled={createDrinkPending} />
                  <DrinkBoolField control={createForm.control} name="isShaken" label="Shaken" testId="switch-drink-shaken" disabled={createDrinkPending} />
                  <DrinkBoolField control={createForm.control} name="isActive" label="Active" testId="switch-drink-active" disabled={createDrinkPending} />
                  <DrinkBoolField control={createForm.control} name="isOutOfStock" label="Out of Stock" testId="switch-drink-out-of-stock" disabled={createDrinkPending} />
                  <FormField
                    control={createForm.control}
                    name="sortOrder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Sort Order</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            disabled={createDrinkPending}
                            data-testid="input-drink-order"
                            value={field.value ?? 0}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={createForm.control}
                  name="ingredientIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ingredients</FormLabel>
                      <div className="rounded-md border p-3">
                        {ingredientsLoading ? (
                          <div className="space-y-2">
                            {[1, 2, 3].map((row) => (
                              <Skeleton key={row} className="h-5 w-full" />
                            ))}
                          </div>
                        ) : ingredients.length > 0 ? (
                          <div className="max-h-48 overflow-y-auto space-y-2">
                            {ingredients.map((ingredient) => {
                              const ids = field.value ?? [];
                              const checked = ids.includes(ingredient.id);
                              return (
                                <label key={ingredient.id} className="flex items-center gap-2 text-sm">
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(c) =>
                                      field.onChange(
                                        c
                                          ? [...ids, ingredient.id]
                                          : ids.filter((id) => id !== ingredient.id),
                                      )
                                    }
                                  />
                                  <span>{ingredient.name}</span>
                                  {ingredient.onHand <= 0 && (
                                    <Badge variant="destructive" className="text-[10px]">Out</Badge>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Add ingredients in Inventory to assign them.</p>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={createDrinkPending}
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
            </Form>
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
                  // Mirror the manage-menu selection into the create form so a
                  // new drink defaults to the menu the bartender is viewing.
                  createForm.setValue("menuId", value);
                  createForm.setValue("sortOrder", getNextSortOrder(value));
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
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Drink</DialogTitle>
              <DialogDescription>
                Update drink information and settings
              </DialogDescription>
            </DialogHeader>
            {editingDrink && (
              <Form {...editForm}>
                <form onSubmit={handleUpdateDrink}>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={editForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Drink Name <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                              <Input placeholder="Midnight Martini" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="menuId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Menu <span className="text-destructive">*</span></FormLabel>
                            <Select
                              value={field.value || "not_specified"}
                              onValueChange={(value) => {
                                const nextMenuId = value === "not_specified" ? "" : value;
                                field.onChange(nextMenuId);
                                // Reset section if the new menu doesn't contain it.
                                const targetMenu = menus?.find((m) => m.id === nextMenuId);
                                const targetSections = targetMenu?.sections || [];
                                const currentSection = editForm.getValues("section");
                                if (currentSection && !targetSections.includes(currentSection)) {
                                  editForm.setValue("section", "");
                                }
                                if (nextMenuId) {
                                  editForm.setValue("sortOrder", getNextSortOrder(nextMenuId));
                                }
                              }}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-edit-drink-menu">
                                  <SelectValue placeholder="Select menu" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="not_specified">Not Specified</SelectItem>
                                {(menus || []).map((menu) => (
                                  <SelectItem key={menu.id} value={menu.id}>
                                    {menu.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="section"
                        render={({ field }) => {
                          const editMenuId = editForm.watch("menuId");
                          const drinkMenu = menus?.find((m) => m.id === editMenuId);
                          const menuSections = drinkMenu?.sections || [];
                          const currentSection = field.value || "";
                          const allSections = currentSection && !menuSections.includes(currentSection)
                            ? [currentSection, ...menuSections]
                            : menuSections;
                          return (
                            <FormItem>
                              <FormLabel>Section <span className="text-destructive">*</span></FormLabel>
                              <Select
                                value={currentSection || "not_specified"}
                                onValueChange={(value) =>
                                  field.onChange(value === "not_specified" ? "" : value)
                                }
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-edit-drink-section">
                                    <SelectValue placeholder="Select section" />
                                  </SelectTrigger>
                                </FormControl>
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
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                    </div>

                    <FormField
                      control={editForm.control}
                      name="style"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Style</FormLabel>
                          <FormControl>
                            <Input placeholder="Dry, Boozy" {...field} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="A classic martini with a twist..."
                              rows={2}
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="recipe"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recipe / Instructions</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="2 oz gin, 0.5 oz dry vermouth, stir with ice..."
                              rows={3}
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="baseSpirit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Base Spirit</FormLabel>
                            <FormControl>
                              <Input placeholder="Gin" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="temperature"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Temperature</FormLabel>
                            <Select
                              value={field.value || "not_specified"}
                              onValueChange={(value) =>
                                field.onChange(value === "not_specified" ? "" : value)
                              }
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select temperature" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="not_specified">Not Specified</SelectItem>
                                <SelectItem value="hot">Hot</SelectItem>
                                <SelectItem value="cold">Cold</SelectItem>
                                <SelectItem value="room_temp">Room Temperature</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <DrinkBoolField control={editForm.control} name="isMocktail" label="Non-Alcoholic" testId="switch-edit-drink-mocktail" />
                      <DrinkBoolField control={editForm.control} name="canBeMocktail" label="Mocktail Available" testId="switch-edit-drink-can-be-mocktail" />
                      <DrinkBoolField control={editForm.control} name="isStirred" label="Stirred" testId="switch-edit-drink-stirred" />
                      <DrinkBoolField control={editForm.control} name="isShaken" label="Shaken" testId="switch-edit-drink-shaken" />
                      <DrinkBoolField control={editForm.control} name="isActive" label="Active" testId="switch-edit-drink-active" />
                      <DrinkBoolField control={editForm.control} name="isOutOfStock" label="Out of Stock" testId="switch-edit-drink-out-of-stock" />
                    </div>

                    <FormField
                      control={editForm.control}
                      name="ingredientIds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ingredients</FormLabel>
                          <div className="rounded-md border p-3">
                            {ingredientsLoading ? (
                              <div className="space-y-2">
                                {[1, 2, 3].map((row) => (
                                  <Skeleton key={row} className="h-5 w-full" />
                                ))}
                              </div>
                            ) : ingredients.length > 0 ? (
                              <div className="max-h-48 overflow-y-auto space-y-2">
                                {ingredients.map((ingredient) => {
                                  const ids = field.value ?? [];
                                  const checked = ids.includes(ingredient.id);
                                  return (
                                    <label key={ingredient.id} className="flex items-center gap-2 text-sm">
                                      <Checkbox
                                        checked={checked}
                                        onCheckedChange={(c) =>
                                          field.onChange(
                                            c
                                              ? [...ids, ingredient.id]
                                              : ids.filter((id) => id !== ingredient.id),
                                          )
                                        }
                                      />
                                      <span>{ingredient.name}</span>
                                      {ingredient.onHand <= 0 && (
                                        <Badge variant="destructive" className="text-[10px]">Out</Badge>
                                      )}
                                    </label>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">Add ingredients in Inventory to assign them.</p>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t mt-4">
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
                      disabled={updateDrinkPending}
                      data-testid="button-update-drink"
                    >
                      {updateDrinkPending ? "Updating..." : "Update Drink"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
