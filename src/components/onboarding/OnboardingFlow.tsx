import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useOnboardingStore } from '@/store/onboardingStore';
import { ProfileSetupStep } from './steps/ProfileSetupStep';
import { PlatformConnectionStep } from './steps/PlatformConnectionStep';
import { VoiceTrainingStep } from './steps/VoiceTrainingStep';
import { DeliveryPreferencesStep } from './steps/DeliveryPreferencesStep';

const steps = [
  { id: 2, title: 'Profile', description: 'Creator setup' },
  { id: 3, title: 'Content', description: 'Sample analysis' },
  { id: 4, title: 'Voice Training', description: 'AI learning' },
  { id: 5, title: 'Delivery', description: 'Preferences' },
];

export function OnboardingFlow() {
  const { currentStep, setStep } = useOnboardingStore();
  const [searchParams] = useSearchParams();
  
  // Handle step parameter from URL (coming from signup)
  useEffect(() => {
    const stepParam = searchParams.get('step');
    if (stepParam) {
      const step = parseInt(stepParam);
      if (step >= 2 && step <= 5) {
        setStep(step);
      }
    } else if (currentStep === 1) {
      // If no step parameter and we're on step 1, start from step 2
      setStep(2);
    }
  }, [searchParams, setStep, currentStep]);
  
  const progress = ((currentStep - 1) / steps.length) * 100;

  const renderStep = () => {
    switch (currentStep) {
      case 2:
        return <ProfileSetupStep />;
      case 3:
        return <PlatformConnectionStep />;
      case 4:
        return <VoiceTrainingStep />;
      case 5:
        return <DeliveryPreferencesStep />;
      default:
        return <ProfileSetupStep />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-violet-500/20 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-gradient-to-r from-emerald-500/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10">
        {/* Header with Progress */}
        <div className="border-b border-gray-800/30 bg-gray-900/60 backdrop-blur-xl">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                  CreatorPulse
                </h1>
                <Badge variant="secondary" className="ml-3">
                  Setup
                </Badge>
              </div>
              <div className="text-sm text-gray-400">
                Step {currentStep - 1} of {steps.length}
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`flex flex-col items-center ${
                      step.id <= currentStep ? 'text-cyan-400' : 'text-gray-500'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium mb-1 ${
                      step.id < currentStep 
                        ? 'bg-emerald-500 text-white'
                        : step.id === currentStep
                          ? 'bg-cyan-500 text-white'
                          : 'bg-gray-700 text-gray-400'
                    }`}>
                      {step.id < currentStep ? '✓' : index + 1}
                    </div>
                    <span className="font-medium">{step.title}</span>
                    <span className="text-gray-500">{step.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="max-w-5xl mx-auto px-6 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}