import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DecoRule } from "@/components/brand/Deco";
import { useToast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";

export default function DashboardLogin() {
  const { barName } = useSettings();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      return apiRequest("POST", "/api/auth/login", { username, password });
    },
    onSuccess: () => {
      toast({
        title: "Login Successful",
        description: "Welcome to the dashboard",
      });
      // Seed the auth cache with the truth we already know — the server just
      // confirmed the session. Previously we called invalidateQueries here,
      // but this page has no observer on /api/auth/check, so invalidation only
      // marked the entry stale; the next page (DashboardLayout) would then
      // read the stale "not authenticated" value, bounce back to login, and
      // only sync after a second click. setQueryData fixes the race
      // synchronously and lets us drop the 100ms setTimeout hack.
      queryClient.setQueryData(["/api/auth/check"], { isAuthenticated: true });
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid password",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      loginMutation.mutate({ username, password });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card variant="framed" className="deco-corners w-full max-w-md">
        <CardHeader className="text-center pt-9">
          {/* Lock set in a brass lozenge, after the logo's deco ring. */}
          <div className="mx-auto mb-5 flex h-11 w-11 rotate-45 items-center justify-center border border-brass/60 shadow-[inset_0_0_0_3px_hsl(var(--popover)),inset_0_0_0_4px_hsl(var(--brass-bright)/0.5)]">
            <Lock className="h-5 w-5 -rotate-45 text-brass" />
          </div>
          <CardTitle className="text-3xl font-serif">{barName}</CardTitle>
          <DecoRule double className="mx-auto mt-3 w-40" />
          <CardDescription className="smallcaps pt-2 text-brass">Dashboard Login</CardDescription>
        </CardHeader>
        <CardContent className="pb-9">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                Username
              </label>
              <Input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
                disabled={loginMutation.isPending}
                aria-describedby="username-hint"
                data-testid="input-username"
              />
              <p id="username-hint" className="text-xs text-muted-foreground">
                The username is <code className="bg-muted px-1 rounded-sm text-foreground">admin</code>. The
                password is the <code className="bg-muted px-1 rounded-sm text-foreground">DASHBOARD_PASSWORD</code> secret.
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                disabled={loginMutation.isPending}
                data-testid="input-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full min-h-11"
              disabled={loginMutation.isPending || !username || !password}
              data-testid="button-login"
            >
              {loginMutation.isPending ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
