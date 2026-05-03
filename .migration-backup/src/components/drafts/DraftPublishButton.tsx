import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface DraftPublishButtonProps {
    content: string;
    draftId?: string;
    onSuccess?: () => void;
    disabled?: boolean;
}

export function DraftPublishButton({ content, draftId, onSuccess, disabled }: DraftPublishButtonProps) {
    const [isPublishing, setIsPublishing] = useState(false);
    const { toast } = useToast();

    const handlePublish = async () => {
        if (!content) return;

        setIsPublishing(true);
        try {
            await api.post('/publish', { 
                content,
                draft_id: draftId 
            });

            toast({
                title: "Published!",
                description: "Your post is now live on LinkedIn.",
            });

            if (onSuccess) onSuccess();
        } catch (error: any) {
            console.error("Publish error:", error);
            toast({
                title: "Publish Failed",
                description: error.response?.data?.error || "Failed to publish content.",
                variant: "destructive",
            });
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <Button
            onClick={handlePublish}
            disabled={disabled || isPublishing}
            className="bg-[#0077b5] hover:bg-[#006097] text-white"
        >
            {isPublishing ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Publishing...
                </>
            ) : (
                <>
                    <Send className="mr-2 h-4 w-4" />
                    Publish Now
                </>
            )}
        </Button>
    );
}
