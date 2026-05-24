import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, Github, QrCode, Wine, ChefHat, BarChart3 } from "lucide-react";

/**
 * Public-facing About page. Reachable from the landing footer and the
 * dashboard sidebar. Explains what Bar Flores is, how it works, and where
 * the source lives — useful for guests who scanned a QR and got curious,
 * and for forks/contributors who landed here from GitHub.
 */
export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back-home">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </Link>
          <h1 className="font-headline text-xl font-semibold">About Bar Flores</h1>
          <div className="w-[88px]" /> {/* spacer to balance the layout */}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        <section className="space-y-3">
          <h2 className="font-headline text-3xl md:text-4xl font-bold">
            A small bar's cocktail menu, on a screen guests already have.
          </h2>
          <p className="font-body text-lg text-muted-foreground leading-relaxed">
            Bar Flores is a self-hosted ordering system built for pop-up bars,
            home parties, and small craft cocktail programs. Guests scan a QR
            code at their table, browse a themed menu, and request a drink in
            two taps. The bartender works from a live queue.
          </p>
        </section>

        <section className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <QrCode className="w-8 h-8 mb-2 text-primary" />
              <CardTitle className="font-headline text-xl">For guests</CardTitle>
              <CardDescription>
                Scan the QR code on your table. Browse the menu. Tap a drink,
                add your name and any notes, place the order. A status banner
                shows you when it's being made.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <ChefHat className="w-8 h-8 mb-2 text-primary" />
              <CardTitle className="font-headline text-xl">For bartenders</CardTitle>
              <CardDescription>
                The dashboard shows incoming orders the moment they're placed,
                with a chime and a tab badge so you can leave the tab in the
                background. Keyboard shortcuts: <kbd className="px-1 py-0.5 text-[10px] bg-muted rounded">S</kbd> starts the
                oldest order, <kbd className="px-1 py-0.5 text-[10px] bg-muted rounded">D</kbd> marks it served.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="w-8 h-8 mb-2 text-primary" />
              <CardTitle className="font-headline text-xl">For operators</CardTitle>
              <CardDescription>
                Rotate seasonal menus, duplicate last year's lineup, theme each
                menu with its own color + hero image, print QR sheets for table
                tents, and see drink popularity over time.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="font-headline text-2xl font-semibold">How it works</h2>
          <ol className="font-body space-y-2 list-decimal list-inside text-muted-foreground">
            <li>An admin signs into <code className="text-foreground bg-muted px-1 py-0.5 rounded">/dashboard-login</code> and creates a menu with drinks.</li>
            <li>The admin generates a QR code for the menu and prints it for tables (Dashboard → QR Codes → Print sheet).</li>
            <li>Guests scan the code, see the themed menu, place an order with optional name and notes.</li>
            <li>Orders land on the bartender's live queue with a soft chime. The bartender taps "Start" then "Served" as they go.</li>
            <li>Guests see status updates inline on the menu page (no app, no signup).</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="font-headline text-2xl font-semibold">Open source</h2>
          <p className="font-body text-muted-foreground leading-relaxed">
            Bar Flores is open-source under the MIT license. Fork it, run your
            own bar, or build on top. The code, deploy instructions, and
            contribution notes live on GitHub.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <a
              href="https://github.com/benito-os/BarMenu"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-github"
            >
              <Button variant="outline">
                <Github className="w-4 h-4 mr-2" />
                View on GitHub
              </Button>
            </a>
            <Link href="/">
              <Button variant="default">
                <Wine className="w-4 h-4 mr-2" />
                See tonight's menu
              </Button>
            </Link>
          </div>
        </section>

        <footer className="pt-8 border-t text-center text-xs text-muted-foreground font-body">
          Built with React, TypeScript, Drizzle, Tailwind. MIT licensed.
        </footer>
      </main>
    </div>
  );
}
