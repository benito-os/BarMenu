import { DashboardLayout } from "@/components/DashboardLayout";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";

export default function SettingsPage() {
  const { isAuthenticated, logout, logoutPending } = useDashboardAuth();

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-full">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="text-3xl font-bold font-serif">Settings</h1>
            <p className="text-muted-foreground mt-2">
              Manage your account and application preferences
            </p>
          </div>

          {/* Account Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                Account Settings
              </CardTitle>
              <CardDescription>
                Your current account status and information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Authentication Status</p>
                    <p className="text-sm text-muted-foreground">
                      You are currently logged in to the dashboard
                    </p>
                  </div>
                  {isAuthenticated && (
                    <Badge variant="default" className="bg-green-500" data-testid="badge-authenticated">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Authenticated
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Application Info */}
          <Card>
            <CardHeader>
              <CardTitle>Application Information</CardTitle>
              <CardDescription>
                Details about Bar Flores dashboard system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="font-medium mb-1">Application Name</p>
                  <p className="text-muted-foreground">Bar Flores Dashboard</p>
                </div>
                
                <div>
                  <p className="font-medium mb-1">Version</p>
                  <p className="text-muted-foreground">1.0.0</p>
                </div>

                <div>
                  <p className="font-medium mb-1">Description</p>
                  <p className="text-muted-foreground">
                    A sophisticated drink ordering and management system for craft cocktail bars
                  </p>
                </div>

                <div>
                  <p className="font-medium mb-2">Features</p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-500" />
                      <span>Live order queue management with real-time updates</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-500" />
                      <span>Analytics and drink popularity tracking</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-500" />
                      <span>Menu and drink catalog management</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-500" />
                      <span>QR code generation for easy guest access</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-500" />
                      <span>Mobile-optimized guest ordering experience</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible actions that affect your session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Logout</p>
                  <p className="text-sm text-muted-foreground">
                    End your current session and return to the login page
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      disabled={logoutPending}
                      data-testid="button-logout-danger"
                    >
                      {logoutPending ? "Logging out..." : "Logout"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You will be returned to the login page and will need to authenticate again to access the dashboard.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel data-testid="button-cancel-logout">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={logout}
                        data-testid="button-confirm-logout"
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Logout
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
