import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Linkedin, Mail, Sparkles, Zap, TrendingUp } from 'lucide-react';
import { useOnboardingStore } from '@/store/onboardingStore';

const welcomeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
});

type WelcomeFormData = z.infer<typeof welcomeSchema>;

export function WelcomeStep() {
  const { updateUserData, nextStep, isLoading } = useOnboardingStore();

  const { register, handleSubmit, formState: { errors } } = useForm<WelcomeFormData>({
    resolver: zodResolver(welcomeSchema),
  });

  const onSubmit = (data: WelcomeFormData) => {
    updateUserData(data);
    nextStep();
  };

  const handleSocialAuth = (provider: string) => {
    updateUserData({ authProvider: provider });
    nextStep();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="max-w-md mx-auto space-y-6"
    >
      {/* Hero */}
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-primary rounded-2xl flex items-center justify-center shadow-sm">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome to CreatorPulse</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Your AI-powered content creation co-pilot is ready to transform your workflow
          </p>
        </div>

        {/* Value Props */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-primary/8 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground font-medium">10x Faster</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-xs text-muted-foreground font-medium">2x Engagement</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-accent/8 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-accent" />
            </div>
            <p className="text-xs text-muted-foreground font-medium">AI-Powered</p>
          </div>
        </div>
      </div>

      {/* Social Auth */}
      <Card className="shadow-sm">
        <CardHeader className="text-center pb-3">
          <CardTitle className="text-base">Get Started</CardTitle>
          <CardDescription className="text-sm">Connect your social account for instant setup</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            onClick={() => handleSocialAuth('linkedin')}
            variant="outline"
            className="w-full border-blue-200 hover:bg-blue-50 text-blue-700 hover:border-blue-300"
            disabled={isLoading}
          >
            <Linkedin className="w-4 h-4 mr-2" />
            Continue with LinkedIn
          </Button>
        </CardContent>
      </Card>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-3 text-muted-foreground">Or continue with email</span>
        </div>
      </div>

      {/* Email Form */}
      <Card className="shadow-sm">
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Enter your full name"
                className="mt-1"
              />
              {errors.name && (
                <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="Enter your email address"
                className="mt-1"
              />
              {errors.email && (
                <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
              <Mail className="w-4 h-4 mr-2" />
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        By continuing, you agree to our Terms of Service and Privacy Policy
      </p>
    </motion.div>
  );
}
