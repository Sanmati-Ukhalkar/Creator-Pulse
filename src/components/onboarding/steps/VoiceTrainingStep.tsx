import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { Brain, Zap, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { useOnboardingStore } from '@/store/onboardingStore';

interface AnalysisMetric {
  label: string;
  value: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
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
    },
    {
      label: 'Content Structure',
      value: 92,
      description: 'Format preferences and organization',
      icon: TrendingUp,
    },
    {
      label: 'Engagement Patterns',
      value: 78,
      description: 'Timing and engagement optimization',
      icon: Zap,
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
      
      // Simulate AI analysis for each platform
      for (let j = 0; j <= 100; j += 10) {
        setAnalysisProgress(j);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Update voice training data for this platform
      const confidenceScore = Math.floor(Math.random() * 20) + 70; // 70-90%
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

  const handleContinue = () => {
    nextStep();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.5 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Training your AI voice</h2>
        <p className="text-gray-400">
          Our AI is analyzing your content to learn your unique writing style
        </p>
      </div>

      {/* Analysis Progress */}
      <Card className="bg-gray-900/60 backdrop-blur-xl border-gray-800/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Voice Analysis in Progress</CardTitle>
              <CardDescription>
                Analyzing {totalSamples} content samples across {platforms.length} platforms
              </CardDescription>
            </div>
            {!isAnalyzing && analysisComplete && (
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAnalyzing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">
                  Analyzing {platforms[currentPlatform]} content...
                </span>
                <span className="text-cyan-400">{analysisProgress}%</span>
              </div>
              <Progress value={analysisProgress} className="h-2" />
            </div>
          )}

          {/* Platform Analysis Results */}
          <div className="grid gap-3">
            {platforms.map((platform, index) => {
              const platformTraining = voiceTraining.find(vt => vt.platform === platform);
              const isCurrentlyAnalyzing = isAnalyzing && currentPlatform === index;
              const isComplete = platformTraining?.analysisComplete;
              const samplesCount = contentSamples.filter(s => s.platform === platform).length;
              
              return (
                <motion.div
                  key={platform}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    isComplete 
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : isCurrentlyAnalyzing 
                        ? 'bg-cyan-500/10 border-cyan-500/30'
                        : 'bg-gray-800/30 border-gray-700'
                  }`}
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center mr-3">
                      <span className="text-white text-sm font-bold capitalize">
                        {platform.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium capitalize">{platform}</h3>
                      <p className="text-sm text-gray-400">{samplesCount} samples</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {isCurrentlyAnalyzing && (
                      <div className="flex items-center text-cyan-400">
                        <Clock className="w-4 h-4 mr-1 animate-pulse" />
                        <span className="text-sm">Analyzing...</span>
                      </div>
                    )}
                    
                    {isComplete && (
                      <>
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                          {platformTraining?.confidenceScore}% match
                        </Badge>
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-gray-900/60 backdrop-blur-xl border-gray-800/30">
            <CardHeader>
              <CardTitle>Voice Analysis Results</CardTitle>
              <CardDescription>
                Your AI writing assistant is ready with {getOverallConfidence()}% confidence
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {analysisMetrics.map((metric, index) => {
                  const IconComponent = metric.icon;
                  return (
                    <motion.div
                      key={metric.label}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg"
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center mr-3">
                          <IconComponent className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-medium">{metric.label}</h3>
                          <p className="text-sm text-gray-400">{metric.description}</p>
                        </div>
                      </div>
                      <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
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
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border-cyan-500/30">
            <CardContent className="p-6 text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-cyan-500 to-violet-500 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-white">{getOverallConfidence()}%</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Voice Training Complete!</h3>
              <p className="text-gray-400 mb-4">
                Your AI assistant has successfully learned your writing style and is ready to create content that sounds authentically you.
              </p>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                Ready for content generation
              </Badge>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={prevStep}>
          Back
        </Button>
        <Button 
          onClick={handleContinue} 
          disabled={!analysisComplete || isLoading}
        >
          {isLoading ? 'Setting up...' : 'Continue to Delivery Preferences'}
        </Button>
      </div>
    </motion.div>
  );
}