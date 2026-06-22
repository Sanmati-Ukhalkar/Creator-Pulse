import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Download } from "lucide-react";

export default function CarouselPage() {
    const [topic, setTopic] = useState("");
    const [jobId, setJobId] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('idle');
    const [slides, setSlides] = useState<any[]>([]);
    const [exportsReady, setExportsReady] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const getAuthToken = () => {
        return localStorage.getItem('auth_token') || ''; 
    };

    const handleGenerate = async () => {
        if (!topic) return;
        setStatus('submitting');
        setError(null);
        
        try {
            const idempotencyKey = crypto.randomUUID();
            const res = await fetch('http://localhost:4000/api/carousel/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({ topic, idempotency_key: idempotencyKey })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to generate carousel');
            
            setJobId(data.jobId);
            setStatus('queued');
        } catch (err: any) {
            setError(err.message);
            setStatus('failed');
        }
    };

    useEffect(() => {
        if (!jobId || status === 'done' || status === 'failed') return;
        
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`http://localhost:4000/api/carousel/${jobId}`, {
                    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
                });
                if (!res.ok) return;
                
                const data = await res.json();
                setStatus(data.job.status);
                if (data.job.status === 'done') {
                    setSlides(data.slides || []);
                    setExportsReady(data.exports);
                    clearInterval(interval);
                } else if (data.job.status === 'failed') {
                    setError('Generation failed inside backend pipeline.');
                    clearInterval(interval);
                }
            } catch (err) {
                console.error("Polling error", err);
            }
        }, 3000); 

        return () => clearInterval(interval);
    }, [jobId, status]);

    return (
        <div className="container mx-auto p-8 space-y-8 animate-fade-in">
            <div>
                <h1 className="text-4xl font-bold tracking-tight mb-2">Carousel Engine</h1>
                <p className="text-muted-foreground">Transform a topic into a fully-designed 6-slide LinkedIn Carousel completely async.</p>
            </div>

            <Card className="max-w-xl glass-card relative overflow-hidden transition-all duration-500 hover:shadow-xl hover:shadow-primary/5">
                <CardHeader>
                    <CardTitle>Topic Blueprint</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <Input 
                        placeholder="e.g. Why async-first architectures scale better" 
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        disabled={status !== 'idle' && status !== 'failed'}
                        className="h-12 border-primary/20 text-lg focus:border-primary/50 transition-all"
                    />
                    
                    {error && <div className="text-red-500 text-sm font-medium p-3 bg-red-500/10 rounded-lg border border-red-500/20">{error}</div>}
                    
                    <Button 
                        onClick={handleGenerate} 
                        disabled={!topic || (status !== 'idle' && status !== 'failed')}
                        className="w-full h-12 text-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white shadow-lg transition-all duration-300 hover:scale-[1.02]"
                    >
                        {status !== 'idle' && status !== 'done' && status !== 'failed' && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                        {status === 'idle' || status === 'failed' ? 'Generate Carousel ✨' : `Status: ${status.toUpperCase()}...`}
                    </Button>
                </CardContent>
            </Card>

            {status === 'done' && slides.length > 0 && (
                <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-700">
                    <h2 className="text-2xl font-bold border-b border-primary/10 pb-2">Slide Previews</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {slides.map((s, idx) => (
                            <Card key={idx} className="overflow-hidden glass-card transition-all duration-500 hover:scale-[1.05] hover:shadow-xl hover:shadow-primary/10 group cursor-pointer border border-primary/10 hover:border-primary/30">
                                <CardHeader className="p-4 bg-gradient-to-r from-muted/30 to-muted/10 border-b border-primary/5 group-hover:from-primary/5 transition-colors">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-semibold text-primary">Slide {idx + 1}</span>
                                        <span className="text-muted-foreground capitalize text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">{s.slide_type}</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <img 
                                        src={`http://localhost:4000/api/carousel/${jobId}/asset/${jobId}_${s.id}.png?token=${getAuthToken()}`} 
                                        alt={`Slide ${idx+1}`}
                                        className="w-full h-auto aspect-square object-cover"
                                    />
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {exportsReady && (
                        <Card className="mt-12 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent overflow-hidden relative group">
                            <div className="absolute inset-0 bg-primary/5 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-700 ease-in-out" />
                            <CardContent className="p-8 flex items-center justify-between relative z-10">
                                <div className="space-y-1">
                                    <h3 className="font-bold text-2xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">Export Ready</h3>
                                    <p className="text-sm text-muted-foreground font-medium">Your high-resolution assets have been successfully bundled.</p>
                                </div>
                                <div className="flex gap-4">
                                    <a href={`http://localhost:4000/api/carousel/${jobId}/asset/${exportsReady.zip_storage_path}?token=${getAuthToken()}`} download>
                                        <Button variant="outline" className="h-12 px-6 border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all font-medium"><Download className="mr-2 h-5 w-5" /> Download ZIP</Button>
                                    </a>
                                    <a href={`http://localhost:4000/api/carousel/${jobId}/asset/${exportsReady.pdf_storage_path}?token=${getAuthToken()}`} download>
                                        <Button className="h-12 px-6 bg-primary text-primary-foreground shadow-lg hover:shadow-primary/25 hover:scale-105 transition-all font-medium"><Download className="mr-2 h-5 w-5" /> Download PDF</Button>
                                    </a>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
