import { DashboardLayout } from "@/components/DashboardLayout";
import { InventorySection } from "@/components/InventorySection";

export default function InventoryPage() {
  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-full space-y-6">
        <InventorySection />
      </div>
    </DashboardLayout>
  );
}
