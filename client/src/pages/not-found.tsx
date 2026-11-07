import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

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
        <p className="font-body text-sm text-muted-foreground">404</p>
        <h1 className="font-headline text-3xl md:text-4xl font-bold text-foreground">
          That page isn't on the menu
        </h1>
        <p className="font-body text-muted-foreground leading-relaxed">
          The link may be out of date, or the menu it pointed to has been
          retired. Tonight's menus are one tap away.
        </p>
        <Link href="/">
          <Button size="lg" className="min-h-11" data-testid="button-not-found-home">
            <Home className="w-4 h-4 mr-2" />
            See the menus
          </Button>
        </Link>
      </div>
    </div>
  );
}
