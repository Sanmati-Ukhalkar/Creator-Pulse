import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Linkedin, CheckCircle, XCircle, Settings, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LinkedInStatus {
    connected: boolean;
    username?: string;
    linkedinId?: string;
    tokenValid?: boolean;
}

export function LinkedInConnect() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();

    // Fetch Connection Status
    const { data: status, isLoading } = useQuery<LinkedInStatus>({
        queryKey: ['linkedin-status'],
        queryFn: async () => {
            const { data } = await api.get('/linkedin/status');
            return data;
        },
        retry: false,
    });

    // Handle OAuth Callback Effects
    useEffect(() => {
        const linkedinParam = searchParams.get('linkedin');

        if (linkedinParam === 'success') {
            toast({
                title: "LinkedIn Connected",
                description: "Your LinkedIn account has been successfully linked.",
                variant: "default",
            });
            // Clear param
            searchParams.delete('linkedin');
            setSearchParams(searchParams);
            // Refetch status
            queryClient.invalidateQueries({ queryKey: ['linkedin-status'] });
        } else if (linkedinParam === 'error' || linkedinParam === 'invalid_state') {
            toast({
                title: "Connection Failed",
                description: "Failed to connect LinkedIn. Please try again.",
                variant: "destructive",
            });
            searchParams.delete('linkedin');
            setSearchParams(searchParams);
        }
    }, [searchParams, setSearchParams, toast, queryClient]);

    // Connect Mutation
    const connectMutation = useMutation({
        mutationFn: async () => {
            const { data } = await api.get('/linkedin/auth-url');
            return data.url;
        },
        onSuccess: (url) => {
            window.location.href = url; // Redirect to LinkedIn
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Could not initiate LinkedIn connection.",
                variant: "destructive",
            });
        }
    });

    // Disconnect Mutation
    const disconnectMutation = useMutation({
        mutationFn: async () => {
            await api.delete('/linkedin/disconnect');
        },
        onSuccess: () => {
            toast({
                title: "Disconnected",
                description: "LinkedIn account disconnected.",
            });
            queryClient.invalidateQueries({ queryKey: ['linkedin-status'] });
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Failed to disconnect LinkedIn.",
                variant: "destructive",
            });
        }
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
                <span className="text-muted-foreground">Checking connection...</span>
            </div>
        );
    }

    const isConnected = status?.connected ?? false;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Linkedin className="h-5 w-5 text-[#0077b5]" />
                    LinkedIn API Integration
                </CardTitle>
                <CardDescription>
                    Connect your LinkedIn account to analyze posts and publish content directly
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-50">
                            <Linkedin className="h-5 w-5 text-[#0077b5]" />
                        </div>
                        <div>
                            <p className="font-medium">LinkedIn Professional Account</p>
                            <p className="text-sm text-muted-foreground">
                                {isConnected
                                    ? (status?.username || "Connected User")
                                    : "Not connected"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isConnected && (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
                                <CheckCircle className="h-3 w-3" /> Connected
                            </Badge>
                        )}

                        {isConnected ? (
                            <Button
                                variant="outline"
                                onClick={() => disconnectMutation.mutate()}
                                disabled={disconnectMutation.isPending}
                            >
                                {disconnectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Disconnect"}
                            </Button>
                        ) : (
                            <Button
                                onClick={() => connectMutation.mutate()}
                                disabled={connectMutation.isPending}
                                className="bg-[#0077b5] hover:bg-[#005e93] text-white"
                            >
                                {connectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Linkedin className="h-4 w-4 mr-2" />}
                                Connect LinkedIn
                            </Button>
                        )}
                    </div>
                </div>

                {isConnected && (
                    <div className="space-y-3 pt-2">
                        <Separator />
                        <div className="grid gap-2">
                            <Label className="text-sm font-medium">Active Permissions</Label>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="secondary" className="font-normal">openid</Badge>
                                <Badge variant="secondary" className="font-normal">profile</Badge>
                                <Badge variant="secondary" className="font-normal">email</Badge>
                                <Badge variant="secondary" className="font-normal">w_member_social</Badge>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                            <span>Token Status: {status?.tokenValid ? 'Valid' : 'Expired (Will Refresh)'}</span>
                            {/* Optional: Last Sync info */}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
