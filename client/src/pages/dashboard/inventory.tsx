import { DashboardLayout } from "@/components/DashboardLayout";
import { InventorySection } from "@/components/InventorySection";
import { ShoppingListSheet } from "@/components/ShoppingListSheet";

export default function InventoryPage() {
  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-full space-y-4 md:space-y-6">
        <InventorySection actions={<ShoppingListSheet triggerClassName="max-md:px-3" />} />
      </div>
    </DashboardLayout>
  );
}
