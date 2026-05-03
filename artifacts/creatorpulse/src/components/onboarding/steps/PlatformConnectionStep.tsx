import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { Trash2, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import { useOnboardingStore } from '@/store/onboardingStore';
import type { ContentSample } from '@/types/onboarding';

const platformColors: Record<string, string> = {
  twitter: 'bg-slate-800',
  linkedin: 'bg-blue-600',
  instagram: 'bg-gradient-to-r from-purple-500 to-pink-500',
  youtube: 'bg-red-600',
  tiktok: 'bg-slate-900',
  threads: 'bg-slate-900',
};

export function PlatformConnectionStep() {
  const {
    profileData,
    contentSamples,
    addContentSample,
    removeContentSample,
    nextStep,
    prevStep,
    isLoading
  } = useOnboardingStore();

  const [activeTab, setActiveTab] = useState(profileData.platforms[0] || 'twitter');
  const [newSample, setNewSample] = useState({ content: '' });

  const platformHeadings: Record<string, string> = {
    twitter: "Top Twitter Content",
    linkedin: "Top LinkedIn Content",
    instagram: "Top Instagram Content"
  };

  const handleAddSample = () => {
    if (!newSample.content.trim()) return;

    const sample: ContentSample = {
      id: Date.now().toString(),
      platform: activeTab,
      content: newSample.content,
      engagementMetrics: {
        likes: Math.floor(Math.random() * 1000),
        comments: Math.floor(Math.random() * 100),
        shares: Math.floor(Math.random() * 50),
        views: Math.floor(Math.random() * 10000),
      },
    };

    addContentSample(sample);
    setNewSample({ content: '' });
  };

  const getSamplesForPlatform = (platform: string) =>
    contentSamples.filter(sample => sample.platform === platform);

  const getMinSamplesForPlatform = (platform: string) =>
    getSamplesForPlatform(platform).length >= 3;

  const allPlatformsReady = profileData.platforms.every(getMinSamplesForPlatform);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-1">Connect your best content</h2>
        <p className="text-muted-foreground text-sm">
          Share 3+ high-performing posts from each platform to train your AI voice
        </p>
      </div>

      {/* Platform Tabs */}
      <div className="flex flex-wrap gap-2 justify-center">
        {profileData.platforms.map((platform) => {
          const samplesCount = getSamplesForPlatform(platform);
          const isComplete = samplesCount.length >= 3;
          const isActivePlatform = activeTab === platform;

          return (
            <Button
              key={platform}
              variant={isActivePlatform ? "default" : "outline"}
              onClick={() => setActiveTab(platform)}
              className={isActivePlatform ? 'bg-primary hover:bg-primary/90' : ''}
            >
              <span className="capitalize">{platform}</span>
              {isComplete && <CheckCircle className="w-3.5 h-3.5 ml-2 text-emerald-300" />}
              <Badge variant="secondary" className="ml-2 text-xs">
                {samplesCount.length}/3
              </Badge>
            </Button>
          );
        })}
      </div>

      {/* Content Samples */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">
                {platformHeadings[activeTab] || `Top ${activeTab} Content`}
              </CardTitle>
              <CardDescription>
                Paste your top-performing {activeTab} content here...
              </CardDescription>
            </div>
            <div className={`w-2.5 h-2.5 rounded-full ${
              getMinSamplesForPlatform(activeTab) ? 'bg-emerald-500' : 'bg-amber-400'
            }`} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {getSamplesForPlatform(activeTab).map((sample) => (
            <motion.div
              key={sample.id}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-muted/50 rounded-lg p-4 space-y-2 border border-border"
            >
              <div className="flex justify-between items-start">
                <p className="text-sm text-foreground line-clamp-3 flex-1">{sample.content}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeContentSample(sample.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-2 flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
              {sample.engagementMetrics && (
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>❤️ {sample.engagementMetrics.likes}</span>
                  <span>💬 {sample.engagementMetrics.comments}</span>
                  <span>🔄 {sample.engagementMetrics.shares}</span>
                  {sample.engagementMetrics.views && <span>👁️ {sample.engagementMetrics.views}</span>}
                </div>
              )}
            </motion.div>
          ))}

          {/* Add Sample Form */}
          <div className="border border-dashed border-border rounded-lg p-4 space-y-3">
            <div>
              <Label htmlFor="content">Paste Content</Label>
              <Textarea
                id="content"
                placeholder={`Paste your top-performing ${activeTab} content here...`}
                value={newSample.content}
                onChange={(e) => setNewSample({ content: e.target.value })}
                className="mt-1 min-h-[150px] resize-y"
              />
              <div className="text-xs text-muted-foreground mt-1">
                {newSample.content.length} characters
              </div>
            </div>
            <Button
              onClick={handleAddSample}
              disabled={!newSample.content.trim()}
              className="w-full bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Content Sample
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress Summary */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Progress Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {profileData.platforms.map((platform) => {
              const samples = getSamplesForPlatform(platform);
              const isComplete = samples.length >= 3;

              return (
                <div key={platform} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center ${
                      platformColors[platform] || 'bg-slate-600'
                    }`}>
                      <span className="text-white text-xs font-bold capitalize">
                        {platform.charAt(0)}
                      </span>
                    </div>
                    <span className="capitalize font-medium text-sm text-foreground">{platform}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={isComplete ? "default" : "secondary"} className="text-xs">
                      {samples.length}/3 samples
                    </Badge>
                    {isComplete
                      ? <CheckCircle className="w-4 h-4 text-emerald-600" />
                      : <AlertCircle className="w-4 h-4 text-amber-500" />
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={prevStep}>Back</Button>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={nextStep} className="text-muted-foreground">
            Skip for Now
          </Button>
          <Button
            onClick={nextStep}
            disabled={!allPlatformsReady || isLoading}
            className="bg-primary hover:bg-primary/90"
          >
            {isLoading ? 'Analyzing...' : 'Continue to Voice Training'}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
