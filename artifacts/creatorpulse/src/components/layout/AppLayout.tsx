import { SidebarProvider } from "@/components/ui/sidebar";
import { CreatorSidebar } from "@/components/creator/sidebar";
import { useAdmin } from "@/hooks/useAdmin";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  useAdmin();
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full bg-background">
        <CreatorSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border bg-background flex items-center px-4 sticky top-0 z-10">
            <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
            </nav>
          </header>
          <div className="flex-1 p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
