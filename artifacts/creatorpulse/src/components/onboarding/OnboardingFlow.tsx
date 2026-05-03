import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Zap } from 'lucide-react';
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
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const stepParam = searchParams.get('step');
    if (stepParam && currentStep === 1) {
      const step = parseInt(stepParam);
      if (step >= 2 && step <= 5) {
        setStep(step);
      }
    } else if (currentStep === 1) {
      setStep(2);
    } else if (currentStep > 1 && parseInt(stepParam || "1") !== currentStep) {
      setSearchParams({ step: currentStep.toString() }, { replace: true });
    }
  }, [currentStep, searchParams, setStep, setSearchParams]);

  const progress = ((currentStep - 1) / steps.length) * 100;

  const renderStep = () => {
    switch (currentStep) {
      case 2: return <ProfileSetupStep />;
      case 3: return <PlatformConnectionStep />;
      case 4: return <VoiceTrainingStep />;
      case 5: return <DeliveryPreferencesStep />;
      default: return <ProfileSetupStep />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Progress */}
      <div className="border-b border-border bg-background sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold text-foreground">CreatorPulse</h1>
              <Badge variant="secondary" className="ml-1">Setup</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              Step {currentStep - 1} of {steps.length}
            </div>
          </div>

          <div className="space-y-3">
            <Progress value={progress} className="h-1.5" />
            <div className="flex justify-between text-xs">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex flex-col items-center gap-1 ${step.id <= currentStep ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                    step.id < currentStep
                      ? 'bg-emerald-500 text-white'
                      : step.id === currentStep
                        ? 'bg-primary text-white'
                        : 'bg-muted text-muted-foreground'
                  }`}>
                    {step.id < currentStep ? '✓' : index + 1}
                  </div>
                  <span className="font-medium hidden sm:block">{step.title}</span>
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
            transition={{ duration: 0.25 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
