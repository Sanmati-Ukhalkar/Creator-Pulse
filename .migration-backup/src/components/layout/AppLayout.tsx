import { SidebarProvider } from "@/components/ui/sidebar";
import { CreatorSidebar } from "@/components/creator/sidebar";
import { useAdmin } from "@/hooks/useAdmin";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  // Admin status can be leveraged by child components if needed later
  useAdmin();
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full">
        <CreatorSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center px-4">
            <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
              {/* Reserved for breadcrumbs or page actions */}
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