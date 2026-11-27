import { useState } from "react";
import { Check, Copy, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatShoppingListText, useShoppingList } from "@/hooks/useShoppingList";

export function ShoppingListSheet({ triggerClassName }: { triggerClassName?: string } = {}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { data, isLoading, isError, refetch } = useShoppingList(open);
  const items = data?.items ?? [];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatShoppingListText(items));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Could not copy",
        description: "Your browser blocked clipboard access. Select the list and copy it by hand.",
        variant: "destructive",
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className={cn("min-h-11", triggerClassName)} data-testid="button-shopping-list">
          <ShoppingCart className="w-4 h-4 mr-2" />
          Shopping list
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md flex flex-col"
        data-testid="sheet-shopping-list"
      >
        <SheetHeader>
          <SheetTitle>Shopping list</SheetTitle>
          <SheetDescription>
            Items at or below par. Ones that are blocking a drink are first.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto mt-4 -mx-2 px-2">
          {isLoading ? (
            <div className="space-y-3" data-testid="shopping-list-loading">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : isError ? (
            <div className="text-center py-8 space-y-3" role="alert" data-testid="shopping-list-error">
              <p className="text-muted-foreground">
                Couldn't load the shopping list. Check your connection and try again.
              </p>
              <Button variant="outline" className="min-h-11" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 space-y-2" data-testid="shopping-list-empty">
              <p className="font-medium">Nothing to buy</p>
              <p className="text-muted-foreground text-sm">
                Everything is stocked above its par level.
              </p>
            </div>
          ) : (
            <ul className="menu-rows" data-testid="shopping-list-items">
              {items.map((item) => (
                <li key={item.name} className="py-3 min-h-11" data-testid={`shopping-item-${item.name}`}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-sm whitespace-nowrap">buy {item.buy}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.onHand} on hand, par {item.parLevel} {item.unit}
                  </div>
                  {item.blocksDrinks.length > 0 && (
                    <div className="text-xs text-destructive mt-1">
                      Blocks {item.blocksDrinks.join(", ")}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <Button
            className="min-h-11 w-full mt-4"
            onClick={handleCopy}
            data-testid="button-copy-shopping-list"
          >
            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        )}
      </SheetContent>
    </Sheet>
  );
}
