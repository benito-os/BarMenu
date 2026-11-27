import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { DecoRule } from "@/components/brand/Deco";

/**
 * Guest-facing 404. A mistyped QR slug or a stale printed code lands here,
 * so the copy talks to a guest, not a developer, and the one action is the
 * way back to the menu list. Uses theme tokens so it matches the rest of the
 * guest surfaces instead of the old hardcoded grey/red.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-md text-center space-y-6">
        <p className="smallcaps text-brass">No. 404</p>
        <h1 className="font-headline text-4xl md:text-5xl font-bold leading-tight text-foreground">
          That page isn't on the menu
        </h1>
        <DecoRule double className="mx-auto max-w-[12rem]" />
        <p className="font-headline italic text-lg text-muted-foreground leading-relaxed">
          The link may be out of date, or the menu it pointed to has been
          retired. Tonight's menus are one tap away.
        </p>
        <Link href="/" className="inline-block">
          <Button size="lg" className="min-h-11" data-testid="button-not-found-home">
            <Home className="w-4 h-4 mr-2" />
            See the menus
          </Button>
        </Link>
      </div>
    </div>
  );
}
