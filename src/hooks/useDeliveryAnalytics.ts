
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface DeliveryAnalyticsData {
  totalScheduled: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  pendingDeliveries: number;
  successRate: number;
  platformStats: Array<{
    platform: string;
    scheduled: number;
    delivered: number;
    failed: number;
    pending: number;
    rate: number;
  }>;
  dailyDeliveries: Array<{
    date: string;
    scheduled: number;
    delivered: number;
    failed: number;
  }>;
  contentTypeStats: Array<{
    name: string;
    value: number;
    count: number;
  }>;
}

export const useDeliveryAnalytics = (timeRange: string = '7d') => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['delivery-analytics', user?.id, timeRange],
    queryFn: async (): Promise<DeliveryAnalyticsData> => {
      if (!user) throw new Error('User not authenticated');

      // Calculate date range
      const now = new Date();
      const startDate = new Date();

      switch (timeRange) {
        case '24h':
          startDate.setHours(now.getHours() - 24);
          break;
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        default:
          startDate.setDate(now.getDate() - 7);
      }

      // Fetch delivery schedules via API
      const { data: response } = await api.get('/schedule');
      const allDeliveries = response.data || [];

      const deliveries = allDeliveries.filter((d: any) =>
        new Date(d.created_at || d.scheduled_at) >= startDate
      );

      // Calculate basic stats
      const totalScheduled = deliveries.length;
      const successfulDeliveries = deliveries.filter(d => d.status === 'sent').length;
      const failedDeliveries = deliveries.filter(d => d.status === 'failed').length;
      const pendingDeliveries = deliveries.filter(d => d.status === 'scheduled' || d.status === 'processing').length;
      const successRate = totalScheduled > 0 ? (successfulDeliveries / totalScheduled) * 100 : 0;

      // Calculate platform stats
      const platformMap = new Map();
      deliveries.forEach(delivery => {
        const platform = delivery.platform;
        if (!platformMap.has(platform)) {
          platformMap.set(platform, {
            platform: platform.charAt(0).toUpperCase() + platform.slice(1),
            scheduled: 0,
            delivered: 0,
            failed: 0,
            pending: 0,
            rate: 0
          });
        }
        const stats = platformMap.get(platform);
        stats.scheduled++;
        if (delivery.status === 'sent') stats.delivered++;
        if (delivery.status === 'failed') stats.failed++;
        if (delivery.status === 'scheduled' || delivery.status === 'processing') stats.pending++;
      });

      const platformStats = Array.from(platformMap.values()).map(stats => ({
        ...stats,
        rate: stats.scheduled > 0 ? (stats.delivered / stats.scheduled) * 100 : 0
      }));

      // Calculate daily deliveries for the last 7 days
      const dailyMap = new Map();
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayName = days[date.getDay()];
        dailyMap.set(dayName, { date: dayName, scheduled: 0, delivered: 0, failed: 0 });
      }

      deliveries.forEach(delivery => {
        const deliveryDate = new Date(delivery.created_at);
        const dayName = days[deliveryDate.getDay()];
        if (dailyMap.has(dayName)) {
          const stats = dailyMap.get(dayName);
          stats.scheduled++;
          if (delivery.status === 'sent') stats.delivered++;
          if (delivery.status === 'failed') stats.failed++;
        }
      });

      const dailyDeliveries = Array.from(dailyMap.values());

      // Calculate content type stats
      const contentTypeMap = new Map();
      deliveries.forEach(delivery => {
        const type = delivery.content_type || 'post';
        const displayName = type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        if (!contentTypeMap.has(type)) {
          contentTypeMap.set(type, { name: displayName, count: 0 });
        }
        contentTypeMap.get(type).count++;
      });

      const contentTypeStats = Array.from(contentTypeMap.values()).map((stat, index) => ({
        ...stat,
        value: totalScheduled > 0 ? (stat.count / totalScheduled) * 100 : 0
      }));

      return {
        totalScheduled,
        successfulDeliveries,
        failedDeliveries,
        pendingDeliveries,
        successRate,
        platformStats,
        dailyDeliveries,
        contentTypeStats
      };
    },
    enabled: !!user,
    refetchInterval: 30000 // Refresh every 30 seconds
  });
};
