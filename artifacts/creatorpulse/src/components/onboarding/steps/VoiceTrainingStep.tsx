import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { Brain, Zap, CheckCircle, Clock, TrendingUp, Loader2 } from 'lucide-react';
import { useOnboardingStore } from '@/store/onboardingStore';

interface AnalysisMetric {
  label: string;
  value: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export function VoiceTrainingStep() {
  const {
    profileData,
    contentSamples,
    voiceTraining,
    updateVoiceTraining,
    nextStep,
    prevStep,
    isLoading
  } = useOnboardingStore();

  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentPlatform, setCurrentPlatform] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  const platforms = profileData.platforms;
  const totalSamples = contentSamples.length;

  const analysisMetrics: AnalysisMetric[] = [
    {
      label: 'Writing Style',
      value: 85,
      description: 'Tone, voice, and linguistic patterns',
      icon: Brain,
      color: 'bg-primary/10 text-primary',
    },
    {
      label: 'Content Structure',
      value: 92,
      description: 'Format preferences and organization',
      icon: TrendingUp,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Engagement Patterns',
      value: 78,
      description: 'Timing and engagement optimization',
      icon: Zap,
      color: 'bg-violet-50 text-violet-600',
    },
  ];

  useEffect(() => {
    if (!isAnalyzing) {
      startAnalysis();
    }
  }, []);

  const startAnalysis = async () => {
    setIsAnalyzing(true);

    for (let i = 0; i < platforms.length; i++) {
      setCurrentPlatform(i);
      const platform = platforms[i];
      const platformSamples = contentSamples.filter(s => s.platform === platform);

      for (let j = 0; j <= 100; j += 10) {
        setAnalysisProgress(j);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      const confidenceScore = Math.floor(Math.random() * 20) + 70;
      updateVoiceTraining({
        platform,
        samples: platformSamples,
        analysisComplete: true,
        confidenceScore,
      });

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsAnalyzing(false);
    setAnalysisComplete(true);
  };

  const getOverallConfidence = () => {
    if (voiceTraining.length === 0) return 0;
    const scores = voiceTraining.map(vt => vt.confidenceScore || 0);
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.4 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">Training your AI voice</h2>
        <p className="text-muted-foreground text-sm">
          Our AI is analyzing your content to learn your unique writing style
        </p>
      </div>

      {/* Analysis Progress */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Voice Analysis in Progress</CardTitle>
              <CardDescription>
                Analyzing {totalSamples} content samples across {platforms.length} platforms
              </CardDescription>
            </div>
            {!isAnalyzing && analysisComplete && (
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            )}
            {isAnalyzing && (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAnalyzing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Analyzing {platforms[currentPlatform]} content...
                </span>
                <span className="font-medium text-primary">{analysisProgress}%</span>
              </div>
              <Progress value={analysisProgress} className="h-2" />
            </div>
          )}

          {/* Platform Analysis Results */}
          <div className="grid gap-2">
            {platforms.map((platform, index) => {
              const platformTraining = voiceTraining.find(vt => vt.platform === platform);
              const isCurrentlyAnalyzing = isAnalyzing && currentPlatform === index;
              const isComplete = platformTraining?.analysisComplete;
              const samplesCount = contentSamples.filter(s => s.platform === platform).length;

              return (
                <motion.div
                  key={platform}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-200 ${
                    isComplete
                      ? 'bg-emerald-50 border-emerald-200'
                      : isCurrentlyAnalyzing
                        ? 'bg-primary/5 border-primary/30'
                        : 'bg-muted/30 border-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                      <span className="text-white text-sm font-bold capitalize">
                        {platform.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground capitalize">{platform}</h3>
                      <p className="text-xs text-muted-foreground">{samplesCount} samples</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isCurrentlyAnalyzing && (
                      <div className="flex items-center text-primary gap-1">
                        <Clock className="w-4 h-4 animate-pulse" />
                        <span className="text-sm">Analyzing…</span>
                      </div>
                    )}
                    {isComplete && (
                      <>
                        <Badge variant="secondary" className="text-emerald-700 bg-emerald-100 border-emerald-200">
                          {platformTraining?.confidenceScore}% match
                        </Badge>
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Analysis Metrics */}
      {analysisComplete && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Voice Analysis Results</CardTitle>
              <CardDescription>
                Your AI writing assistant is ready with {getOverallConfidence()}% confidence
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {analysisMetrics.map((metric, index) => {
                  const IconComponent = metric.icon;
                  return (
                    <motion.div
                      key={metric.label}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${metric.color}`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-medium text-sm text-foreground">{metric.label}</h3>
                          <p className="text-xs text-muted-foreground">{metric.description}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {metric.value}%
                      </Badge>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Overall Confidence Score */}
      {analysisComplete && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="shadow-sm border-emerald-200 bg-emerald-50/50">
            <CardContent className="p-6 text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-primary rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-white">{getOverallConfidence()}%</span>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Voice Training Complete!</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Your AI assistant has successfully learned your writing style and is ready to create content that sounds authentically you.
              </p>
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                Ready for content generation
              </Badge>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={prevStep}>Back</Button>
        <Button
          onClick={nextStep}
          disabled={!analysisComplete || isLoading}
          className="bg-primary hover:bg-primary/90"
        >
          {isLoading ? 'Setting up...' : 'Continue to Delivery Preferences'}
        </Button>
      </div>
    </motion.div>
  );
}
