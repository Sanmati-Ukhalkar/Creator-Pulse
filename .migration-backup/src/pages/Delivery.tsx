
import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
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
  // Enable real-time updates for delivery status changes
  useRealtimeDeliveries();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Delivery Management</h1>
        <p className="text-muted-foreground">
          Schedule, manage, and track your content delivery across multiple platforms
        </p>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="scheduler" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="scheduler" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Scheduler
          </TabsTrigger>
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Queue
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="channels" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Channels
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
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
