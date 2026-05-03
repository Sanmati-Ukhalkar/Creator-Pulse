import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Plus,
  Zap,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useTrendResearch } from "@/hooks/useTrendResearch";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const TrendResearchSection = () => {
  const { triggerResearch, isTriggering } = useTrendResearch();
  const queryClient = useQueryClient();

  const handleTriggerResearch = async () => {
    try {
      await triggerResearch({ title: "Auto-scan", categories: [] });
      toast.success(
        "AI is currently analyzing your sources for emerging trends!",
      );
      // Adding a slight delay so topics component reloads after backend saves them
      setTimeout(
        () => queryClient.invalidateQueries({ queryKey: ["topics"] }),
        1500,
      );
    } catch (e: any) {
      toast.error(e.message || "Failed to trigger research");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "processing":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card className="mb-6 bg-creator-gradient text-white border-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-white">
              <Sparkles className="h-5 w-5" />
              AI Trend Analysis
            </CardTitle>
            <CardDescription className="text-white/80">
              Scans your connected RSS feeds and Twitter timelines to discover
              high-value content opportunities.
            </CardDescription>
          </div>

          <Button
            onClick={handleTriggerResearch}
            disabled={isTriggering}
            variant="secondary"
            className="font-medium"
          >
            {isTriggering ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing Sources...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Scan Sources for Trends
              </>
            )}
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
};
