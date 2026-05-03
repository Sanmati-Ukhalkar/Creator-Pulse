
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeliveryScheduler } from "@/components/delivery/DeliveryScheduler";
import { DeliveryQueue } from "@/components/delivery/DeliveryQueue";
import { DeliveryChannels } from "@/components/delivery/DeliveryChannels";
import { DeliveryHistory } from "@/components/delivery/DeliveryHistory";
import { DeliveryAnalytics } from "@/components/delivery/DeliveryAnalytics";
import { DeliverySettings } from "@/components/delivery/DeliverySettings";
import { useRealtimeDeliveries } from "@/hooks/useRealtimeDeliveries";
import { Clock, Send, History, Settings, BarChart3, Zap } from "lucide-react";

export default function Delivery() {
  useRealtimeDeliveries();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Delivery Management</h1>
        <p className="text-muted-foreground">
          Schedule, manage, and track your content delivery across multiple platforms
        </p>
      </div>

      <Tabs defaultValue="scheduler" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="scheduler" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Scheduler</span>
          </TabsTrigger>
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Queue</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="channels" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Channels</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scheduler" className="space-y-6">
          <DeliveryScheduler />
        </TabsContent>

        <TabsContent value="queue" className="space-y-6">
          <DeliveryQueue />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <DeliveryAnalytics />
        </TabsContent>

        <TabsContent value="channels" className="space-y-6">
          <DeliveryChannels />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <DeliveryHistory />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <DeliverySettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
