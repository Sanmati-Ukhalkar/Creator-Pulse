import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Sparkles, 
  TrendingUp, 
  Settings, 
  Zap,
  BarChart3,
  Calendar,
  Users,
  Rss,
  FileText,
  Send
} from 'lucide-react';
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
  { name: 'Voice Training', href: '/voice-training', icon: Sparkles },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function CreatorSidebar() {
  const { state, setOpen } = useSidebar();
  const location = useLocation();
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar className={collapsed ? "w-16" : "w-64"} collapsible="icon" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <SidebarContent className="bg-sidebar border-r border-sidebar-border">
        {/* Logo */}
        <div className={collapsed ? "p-2 border-b border-sidebar-border" : "p-6 border-b border-sidebar-border"}>
          {!collapsed ? (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-creator-gradient flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold creator-text-gradient">CreatorPulse</span>
            </div>
          ) : (
            <div className="w-10 h-10 mx-auto rounded-lg bg-creator-gradient flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigation.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.href}
                      className={({ isActive: navActive }) =>
                        `flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                          navActive || isActive(item.href)
                            ? 'bg-sidebar-accent text-sidebar-primary border border-sidebar-primary/20'
                            : 'text-white hover:bg-sidebar-accent/50 hover:text-white'
                        }`
                      }
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && <span className="font-medium">{item.name}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Bottom section */}
        <div className="mt-auto p-4 border-t border-sidebar-border">
          {!collapsed && (
            <div className="glass-card p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-creator-gradient flex items-center justify-center text-xs font-semibold text-primary-foreground">
                  A
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-card-foreground truncate">Alex Creator</p>
                  <p className="text-xs text-muted-foreground">Pro Plan</p>
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div className="bg-creator-gradient h-1.5 rounded-full w-3/4"></div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">75% of monthly limit</p>
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}