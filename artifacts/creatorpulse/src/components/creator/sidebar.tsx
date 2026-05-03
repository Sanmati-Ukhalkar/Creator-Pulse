import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Sparkles,
  TrendingUp,
  Settings,
  Zap,
  Rss,
  FileText,
  Send,
  LogOut,
  GitBranch,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Intelligence', href: '/intelligence', icon: TrendingUp },
  { name: 'Sources', href: '/sources', icon: Rss },
  { name: 'Drafts', href: '/drafts', icon: FileText },
  { name: 'Delivery', href: '/delivery', icon: Send },
  { name: 'Workflow', href: '/workflow', icon: GitBranch },
  { name: 'Voice Training', href: '/voice-training', icon: Sparkles },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function CreatorSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === 'collapsed';
  const { user, signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar className={collapsed ? "w-16" : "w-64"} collapsible="icon">
      <SidebarContent className="bg-sidebar border-r border-sidebar-border">
        {/* Logo */}
        <div className={collapsed ? "p-2 border-b border-sidebar-border flex justify-center" : "p-5 border-b border-sidebar-border"}>
          {!collapsed ? (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">CreatorPulse</span>
            </div>
          ) : (
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : "text-xs text-sidebar-foreground/50 uppercase tracking-wider px-3 pt-4 pb-1"}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5 px-2">
              {navigation.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.href}
                      title={collapsed ? item.name : undefined}
                      className={({ isActive: navActive }) =>
                        `flex items-center space-x-3 px-3 py-2 rounded-md transition-all duration-150 text-sm ${navActive || isActive(item.href)
                          ? 'bg-sidebar-accent text-white font-medium'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-white'
                        }`
                      }
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      {!collapsed && <span>{item.name}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Bottom user section */}
        <div className="mt-auto p-3 border-t border-sidebar-border">
          {!collapsed ? (
            <div className="bg-sidebar-accent rounded-lg p-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user?.email || 'Creator'}</p>
                  <p className="text-xs text-sidebar-foreground">Pro Plan</p>
                </div>
                <button
                  onClick={signOut}
                  className="p-1.5 text-sidebar-foreground hover:text-red-400 hover:bg-red-400/10 rounded transition-colors flex-shrink-0"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-2.5 w-full bg-sidebar-border rounded-full h-1">
                <div className="bg-primary h-1 rounded-full w-3/4" />
              </div>
              <p className="text-xs text-sidebar-foreground mt-1">75% of monthly limit</p>
            </div>
          ) : (
            <button
              onClick={signOut}
              className="w-full flex justify-center p-2 text-sidebar-foreground hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
