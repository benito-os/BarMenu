import { useState, useMemo, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { QRCodeSVG } from "qrcode.react";
import type { Menu, InsertMenu } from "@shared/validation";
import { menuCreateSchema } from "@shared/validation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Pencil, QrCode, Plus, X } from "lucide-react";
import { ImageUploader } from "@/components/ImageUploader";
import { ColorPicker } from "@/components/ColorPicker";

export default function MenusPage() {
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [newSectionInput, setNewSectionInput] = useState<string>("");

  // Get base URL for QR codes
  const baseUrl = window.location.origin;

  const {
    menus,
    menusLoading,
    createMenu,
    createMenuPending,
    toggleMenu,
    updateMenu,
    updateMenuPending,
    deleteMenu,
  } = useMenus(true);

  // Create menu form
  const menuForm = useForm<InsertMenu>({
    resolver: zodResolver(menuCreateSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      isActive: false,
      sections: ["Signature Cocktails", "Classics"],
      heroImageUrl: "",
      backgroundColor: "",
      accentColor: "",
      sectionHeaderColor: "",
      menuTitleColor: "",
      typography: "",
    },
  });

  const {
    fields: sectionFields,
    append: appendSection,
    remove: removeSection,
  } = useFieldArray<InsertMenu>({
    control: menuForm.control,
    name: "sections",
  });

  // Sensors for section reordering
  const sectionSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Stable section keys - generated once when editing starts and persists
  const sectionKeysRef = useRef<Map<string, string>>(new Map());

  // Generate stable drag IDs for section reordering
  const sectionDragMapping = useMemo(() => {
    if (!editingMenu?.sections) {
      sectionKeysRef.current = new Map();
      return [];
    }

    // Generate or reuse stable keys for each section
    const mapping = editingMenu.sections.map((section, i) => {
      const lookupKey = `${editingMenu.id}-${i}-${section}`;
      if (!sectionKeysRef.current.has(lookupKey)) {
        sectionKeysRef.current.set(lookupKey, `section-${Math.random().toString(36).substr(2, 9)}`);
      }
      return {
        section,
        index: i,
        dragId: sectionKeysRef.current.get(lookupKey)!,
      };
    });

    return mapping;
  }, [editingMenu?.id, editingMenu?.sections]);

  const onMenuSubmit = (data: InsertMenu) => {
    const cleanedSections = (data.sections || [])
      .map(section => section.trim())
      .filter(Boolean);

    createMenu({
      ...data,
      sections: cleanedSections,
    });

    menuForm.reset();
  };

  // Sortable Section Item Component for Menu Editing
  function SortableSectionItem({
    mapping,
    onRemove
  }: {
    mapping: { section: string; index: number; dragId: string };
    onRemove: () => void;
  }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: mapping.dragId });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center gap-2 p-2 bg-background border rounded hover-elevate"
        data-testid={`section-item-${mapping.index}`}
      >
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
        <Badge variant="secondary" className="flex-1" data-testid={`badge-section-${mapping.index}`}>
          {mapping.section}
        </Badge>
        <button
          type="button"
          onClick={onRemove}
          className="p-1 hover:bg-destructive/20 rounded-full"
          data-testid={`button-remove-section-${mapping.index}`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-full space-y-4">
        {/* Create Menu Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Create New Menu</CardTitle>
            <CardDescription>
              Add a new cocktail menu to your collection
            </CardDescription>
          </CardHeader>
          <CardContent>
            {menusLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <Form {...menuForm}>
                <form onSubmit={menuForm.handleSubmit(onMenuSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={menuForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Menu Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="NYE 2025"
                              {...field}
                              disabled={createMenuPending}
                              data-testid="input-menu-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={menuForm.control}
                      name="slug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Slug (URL-friendly)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="nye-2025"
                              {...field}
                              disabled={createMenuPending}
                              data-testid="input-menu-slug"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={menuForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-col justify-end space-y-2">
                          <div className="flex items-start justify-between gap-3 rounded-md border p-3">
                            <div>
                              <FormLabel>Active Menu</FormLabel>
                              <FormDescription>
                                Immediately make this menu visible to guests
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={createMenuPending}
                                data-testid="switch-menu-active"
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={menuForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="A curated selection of cocktails for..."
                            rows={3}
                            {...field}
                            value={field.value || ""}
                            disabled={createMenuPending}
                            data-testid="input-menu-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="border rounded-md p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold">Sections</h3>
                        <p className="text-xs text-muted-foreground">Organize drinks into groups before adding them</p>
                      </div>
                      <Button
                        type="button"
                        onClick={() => appendSection("")}
                        variant="secondary"
                        size="sm"
                        disabled={createMenuPending}
                        data-testid="button-add-section"
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add section
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {sectionFields.map((sectionField, index) => (
                        <FormField
                          key={sectionField.id}
                          control={menuForm.control}
                          name={`sections.${index}`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="sr-only">Section {index + 1}</FormLabel>
                              <div className="flex gap-2">
                                <FormControl>
                                  <Input
                                    placeholder={`e.g. Section ${index + 1}`}
                                    {...field}
                                    disabled={createMenuPending}
                                    data-testid={`input-menu-section-${index}`}
                                  />
                                </FormControl>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => removeSection(index)}
                                  disabled={createMenuPending || sectionFields.length === 1}
                                  data-testid={`button-remove-section-${index}`}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-semibold mb-4">Theme Customization (Optional)</h3>
                    <div className="space-y-4">
                      <FormField
                        control={menuForm.control}
                        name="heroImageUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hero Image</FormLabel>
                            <FormControl>
                              <ImageUploader
                                value={field.value || ""}
                                onChange={field.onChange}
                                placeholder="https://example.com/image.jpg"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={menuForm.control}
                          name="backgroundColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <ColorPicker
                                  label="Background Color"
                                  value={field.value}
                                  onChange={field.onChange}
                                  placeholder="#f5f5f5"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={menuForm.control}
                          name="accentColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <ColorPicker
                                  label="Accent Color"
                                  value={field.value}
                                  onChange={field.onChange}
                                  placeholder="#c9a227"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={menuForm.control}
                          name="sectionHeaderColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <ColorPicker
                                  label="Section Header Color"
                                  value={field.value}
                                  onChange={field.onChange}
                                  placeholder="#333333"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={menuForm.control}
                          name="menuTitleColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <ColorPicker
                                  label="Menu Title Color"
                                  value={field.value}
                                  onChange={field.onChange}
                                  placeholder="#1a1a1a"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={menuForm.control}
                        name="typography"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Typography Style</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Playfair Display, serif"
                                {...field}
                                value={field.value || ""}
                                disabled={createMenuPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={createMenuPending}
                    data-testid="button-create-menu"
                  >
                    {createMenuPending ? "Creating..." : "Create Menu"}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>

        {/* Manage Menus Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Manage Menus</CardTitle>
            <CardDescription>
              Toggle menu visibility for guests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {menusLoading ? (
              <div className="space-y-4">
                {[1, 2].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : menus && menus.length > 0 ? (
              <div className="space-y-4">
                {menus.map((menu) => (
                  <div
                    key={menu.id}
                    className="flex items-center justify-between p-4 border rounded-md"
                    data-testid={`menu-item-${menu.id}`}
                  >
                    <div className="flex-1">
                      <h3 className="font-serif text-lg font-semibold">{menu.name}</h3>
                      <p className="text-sm text-muted-foreground">{menu.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">Slug: {menu.slug}</p>
                      {menu.sections && menu.sections.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          <span className="text-xs text-muted-foreground">Sections:</span>
                          {menu.sections.map((section, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {section}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingMenu(menu)}
                        data-testid={`button-edit-menu-${menu.id}`}
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            data-testid={`button-delete-menu-${menu.id}`}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Menu</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{menu.name}"? This action will also delete all associated drinks and cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMenu(menu.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" data-testid={`button-qr-${menu.id}`}>
                            <QrCode className="w-4 h-4 mr-2" />
                            QR Code
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>{menu.name} - QR Code</DialogTitle>
                            <DialogDescription>
                              Scan this code to view the menu on your phone
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex flex-col items-center gap-4 py-4">
                            <div className="bg-white p-4 rounded-lg">
                              <QRCodeSVG
                                value={`${baseUrl}/menu/${menu.slug}`}
                                size={256}
                                level="H"
                                includeMargin={true}
                              />
                            </div>
                            <p className="text-sm text-muted-foreground text-center">
                              {`${baseUrl}/menu/${menu.slug}`}
                            </p>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`menu-active-${menu.id}`} className="text-sm">
                          {menu.isActive ? "Active" : "Inactive"}
                        </Label>
                        <Switch
                          id={`menu-active-${menu.id}`}
                          checked={menu.isActive}
                          onCheckedChange={(checked) => {
                            toggleMenu({ id: menu.id, isActive: checked });
                          }}
                          disabled={menusLoading}
                          data-testid={`switch-menu-active-${menu.id}`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No menus created yet. Create your first menu above!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Edit Menu Dialog */}
        <Dialog open={!!editingMenu} onOpenChange={(open) => !open && setEditingMenu(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Menu</DialogTitle>
              <DialogDescription>
                Update menu information and theming
              </DialogDescription>
            </DialogHeader>
            {editingMenu && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateMenu(editingMenu);
                }}
              >
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-menu-name">Menu Name</Label>
                        <Input
                          id="edit-menu-name"
                          value={editingMenu.name}
                          onChange={(e) => setEditingMenu({ ...editingMenu, name: e.target.value })}
                          placeholder="NYE 2025"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-menu-slug">Slug (URL-friendly)</Label>
                        <Input
                          id="edit-menu-slug"
                          value={editingMenu.slug}
                          onChange={(e) => setEditingMenu({ ...editingMenu, slug: e.target.value })}
                          placeholder="nye-2025"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-menu-description">Description</Label>
                      <Textarea
                        id="edit-menu-description"
                        value={editingMenu.description || ""}
                        onChange={(e) => setEditingMenu({ ...editingMenu, description: e.target.value })}
                        placeholder="A curated selection of cocktails for..."
                        rows={3}
                      />
                    </div>

                    <div className="border-t pt-4">
                      <h3 className="text-sm font-semibold mb-4">Theme Customization (Optional)</h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Hero Image</Label>
                          <ImageUploader
                            value={editingMenu.heroImageUrl || ""}
                            onChange={(url) => setEditingMenu({ ...editingMenu, heroImageUrl: url })}
                            placeholder="https://example.com/image.jpg"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <ColorPicker
                            label="Background Color"
                            value={editingMenu.backgroundColor}
                            onChange={(value) => setEditingMenu({ ...editingMenu, backgroundColor: value || "" })}
                            placeholder="#f5f5f5"
                          />
                          <ColorPicker
                            label="Accent Color"
                            value={editingMenu.accentColor}
                            onChange={(value) => setEditingMenu({ ...editingMenu, accentColor: value || "" })}
                            placeholder="#c9a227"
                          />
                          <ColorPicker
                            label="Section Header Color"
                            value={editingMenu.sectionHeaderColor}
                            onChange={(value) => setEditingMenu({ ...editingMenu, sectionHeaderColor: value || "" })}
                            placeholder="#333333"
                          />
                          <ColorPicker
                            label="Menu Title Color"
                            value={editingMenu.menuTitleColor}
                            onChange={(value) => setEditingMenu({ ...editingMenu, menuTitleColor: value || "" })}
                            placeholder="#1a1a1a"
                          />
                        </div>
                        
                        <h4 className="text-sm font-medium text-muted-foreground pt-2">Drink Cards</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <ColorPicker
                            label="Card Background"
                            value={editingMenu.cardBackgroundColor}
                            onChange={(value) => setEditingMenu({ ...editingMenu, cardBackgroundColor: value || "" })}
                            placeholder="#1f1f1f"
                          />
                          <ColorPicker
                            label="Card Border"
                            value={editingMenu.cardBorderColor}
                            onChange={(value) => setEditingMenu({ ...editingMenu, cardBorderColor: value || "" })}
                            placeholder="#333333"
                          />
                        </div>
                        
                        <h4 className="text-sm font-medium text-muted-foreground pt-2">Badges</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <ColorPicker
                            label="Badge Background"
                            value={editingMenu.badgeBackgroundColor}
                            onChange={(value) => setEditingMenu({ ...editingMenu, badgeBackgroundColor: value || "" })}
                            placeholder="#8b5cf6"
                          />
                          <ColorPicker
                            label="Badge Text"
                            value={editingMenu.badgeTextColor}
                            onChange={(value) => setEditingMenu({ ...editingMenu, badgeTextColor: value || "" })}
                            placeholder="#ffffff"
                          />
                        </div>
                        
                        <h4 className="text-sm font-medium text-muted-foreground pt-2">Request Button</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <ColorPicker
                            label="Button Background"
                            value={editingMenu.requestButtonBackgroundColor}
                            onChange={(value) => setEditingMenu({ ...editingMenu, requestButtonBackgroundColor: value || "" })}
                            placeholder="#C9A962"
                          />
                          <ColorPicker
                            label="Button Text"
                            value={editingMenu.requestButtonTextColor}
                            onChange={(value) => setEditingMenu({ ...editingMenu, requestButtonTextColor: value || "" })}
                            placeholder="#000000"
                          />
                        </div>
                        
                        {/* Live Preview */}
                        <h4 className="text-sm font-medium text-muted-foreground pt-2">Preview</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Normal Drink Card Preview */}
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">Available Drink</p>
                            <Card 
                              className="p-4"
                              style={{
                                backgroundColor: editingMenu.cardBackgroundColor || undefined,
                                borderColor: editingMenu.cardBorderColor || undefined
                              }}
                            >
                              <div className="space-y-2">
                                <h4 className="font-semibold text-foreground">Sample Cocktail</h4>
                                <div className="flex flex-wrap gap-1">
                                  <Badge 
                                    variant="secondary"
                                    style={{
                                      backgroundColor: editingMenu.badgeBackgroundColor || undefined,
                                      color: editingMenu.badgeTextColor || undefined
                                    }}
                                  >
                                    Tropical
                                  </Badge>
                                  <Badge 
                                    variant="secondary"
                                    style={{
                                      backgroundColor: editingMenu.badgeBackgroundColor || undefined,
                                      color: editingMenu.badgeTextColor || undefined
                                    }}
                                  >
                                    Mocktail Available
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">A refreshing blend of citrus and mint...</p>
                                <Button
                                  size="sm"
                                  className="w-full mt-2"
                                  style={{
                                    backgroundColor: editingMenu.requestButtonBackgroundColor || undefined,
                                    color: editingMenu.requestButtonTextColor || undefined,
                                    borderColor: editingMenu.requestButtonBackgroundColor || undefined
                                  }}
                                >
                                  Request This Drink
                                </Button>
                              </div>
                            </Card>
                          </div>
                          
                          {/* Ordered Drink Card Preview */}
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">Ordered Drink</p>
                            <Card 
                              className="p-4 relative"
                              style={{
                                backgroundColor: editingMenu.cardBackgroundColor || undefined,
                                borderColor: editingMenu.cardBorderColor || undefined
                              }}
                            >
                              <div className="absolute top-2 right-2">
                                <Badge variant="default" className="bg-amber-600 text-white text-xs">
                                  Preparing...
                                </Badge>
                              </div>
                              <div className="space-y-2">
                                <h4 className="font-semibold text-foreground">Sample Cocktail</h4>
                                <div className="flex flex-wrap gap-1">
                                  <Badge 
                                    variant="secondary"
                                    style={{
                                      backgroundColor: editingMenu.badgeBackgroundColor || undefined,
                                      color: editingMenu.badgeTextColor || undefined
                                    }}
                                  >
                                    Tropical
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">A refreshing blend of citrus and mint...</p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full mt-2"
                                  disabled
                                >
                                  Already Ordered
                                </Button>
                              </div>
                            </Card>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="edit-menu-typography">Typography Style</Label>
                          <Select
                            value={editingMenu.typography || "not_specified"}
                            onValueChange={(value) => setEditingMenu({ ...editingMenu, typography: value === "not_specified" ? "" : value })}
                          >
                            <SelectTrigger id="edit-menu-typography" data-testid="select-edit-menu-typography">
                              <SelectValue placeholder="Select typography" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="not_specified">Not Specified (Default)</SelectItem>
                              <SelectItem value="Playfair Display, serif">Playfair Display (Serif)</SelectItem>
                              <SelectItem value="Inter, sans-serif">Inter (Sans-serif)</SelectItem>
                              <SelectItem value="Roboto, sans-serif">Roboto (Sans-serif)</SelectItem>
                              <SelectItem value="Open Sans, sans-serif">Open Sans (Sans-serif)</SelectItem>
                              <SelectItem value="Lora, serif">Lora (Serif)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Section Management */}
                        <div className="space-y-2">
                          <Label>Menu Sections</Label>
                          <p className="text-xs text-muted-foreground">
                            Define and reorder sections to organize drinks (drag to reorder)
                          </p>
                          {editingMenu.sections && editingMenu.sections.length > 0 && sectionDragMapping.length > 0 && (
                            <DndContext
                              sensors={sectionSensors}
                              collisionDetection={closestCenter}
                              onDragEnd={(event) => {
                                const { active, over } = event;
                                if (over && active.id !== over.id) {
                                  const oldMapping = sectionDragMapping.find(m => m.dragId === active.id);
                                  const newMapping = sectionDragMapping.find(m => m.dragId === over.id);
                                  if (oldMapping && newMapping && oldMapping.index !== newMapping.index) {
                                    const reordered = [...editingMenu.sections];
                                    const [moved] = reordered.splice(oldMapping.index, 1);
                                    reordered.splice(newMapping.index, 0, moved);
                                    setEditingMenu({ ...editingMenu, sections: reordered });
                                  }
                                }
                              }}
                            >
                              <SortableContext
                                items={sectionDragMapping.map(m => m.dragId)}
                                strategy={verticalListSortingStrategy}
                              >
                                <div className="space-y-2 p-3 border rounded-md bg-muted/20">
                                  {sectionDragMapping.map((mapping) => (
                                    <SortableSectionItem
                                      key={mapping.dragId}
                                      mapping={mapping}
                                      onRemove={() => {
                                        const newSections = editingMenu.sections.filter((_, i) => i !== mapping.index);
                                        setEditingMenu({ ...editingMenu, sections: newSections });
                                      }}
                                    />
                                  ))}
                                </div>
                              </SortableContext>
                            </DndContext>
                          )}
                          <div className="flex gap-2">
                            <Input
                              value={newSectionInput}
                              onChange={(e) => setNewSectionInput(e.target.value)}
                              placeholder="Add new section..."
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (newSectionInput.trim()) {
                                    const currentSections = editingMenu.sections || [];
                                    setEditingMenu({ ...editingMenu, sections: [...currentSections, newSectionInput.trim()] });
                                    setNewSectionInput("");
                                  }
                                }
                              }}
                              data-testid="input-new-section"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                if (newSectionInput.trim()) {
                                  const currentSections = editingMenu.sections || [];
                                  setEditingMenu({ ...editingMenu, sections: [...currentSections, newSectionInput.trim()] });
                                  setNewSectionInput("");
                                }
                              }}
                              disabled={!newSectionInput.trim()}
                              data-testid="button-add-section"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 border-t pt-4">
                        <Switch
                          id="edit-menu-active"
                          checked={editingMenu.isActive}
                          onCheckedChange={(checked) => setEditingMenu({ ...editingMenu, isActive: checked })}
                        />
                        <Label htmlFor="edit-menu-active" className="text-sm">Menu is Active (visible to guests)</Label>
                      </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingMenu(null)}
                    disabled={updateMenuPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateMenuPending || !editingMenu.name.trim() || !editingMenu.slug.trim()}
                  >
                    {updateMenuPending ? "Updating..." : "Update Menu"}
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
