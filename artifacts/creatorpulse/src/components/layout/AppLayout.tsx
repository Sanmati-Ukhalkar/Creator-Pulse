import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { CreatorSidebar } from "@/components/creator/sidebar";
import { useAdmin } from "@/hooks/useAdmin";

interface AppLayoutProps {
  children: React.ReactNode;
}

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/intelligence': 'Intelligence',
  '/sources': 'Sources',
  '/drafts': 'Drafts',
  '/delivery': 'Delivery',
  '/workflow': 'Workflow',
  '/voice-training': 'Voice Training',
  '/settings': 'Settings',
};

function LayoutInner({ children }: AppLayoutProps) {
  const { toggleSidebar } = useSidebar();
  const location = useLocation();

  const pageTitle = PAGE_TITLES[location.pathname] ??
    (location.pathname.startsWith('/trends/') ? 'Trend Details' : 'CreatorPulse');

  return (
    <div className="min-h-screen flex w-full bg-background">
      <CreatorSidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 border-b border-border bg-white flex items-center px-4 gap-3 sticky top-0 z-10 shadow-sm">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-foreground">{pageTitle}</h1>
          </div>
        </header>
        <div className="flex-1 p-6 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  useAdmin();
  return (
    <SidebarProvider defaultOpen={true}>
      <LayoutInner>{children}</LayoutInner>
    </SidebarProvider>
  );
}
