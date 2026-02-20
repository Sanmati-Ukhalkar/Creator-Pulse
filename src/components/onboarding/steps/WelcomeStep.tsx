import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Twitter, Linkedin, Instagram, Mail, Sparkles, Zap, TrendingUp } from 'lucide-react';
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
    // TODO: Implement Supabase OAuth
    updateUserData({ authProvider: provider });
    nextStep();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="max-w-md mx-auto space-y-6"
    >
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="w-20 h-20 mx-auto bg-gradient-to-br from-cyan-500 to-violet-500 rounded-2xl flex items-center justify-center"
        >
          <Sparkles className="w-10 h-10 text-white" />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
            Welcome to CreatorPulse
          </h1>
          <p className="text-gray-400 mt-2">
            Your AI-powered content creation co-pilot is ready to transform your creative workflow
          </p>
        </motion.div>

        {/* Value Props */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-3 gap-4 mt-6"
        >
          <div className="text-center">
            <Zap className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
            <p className="text-xs text-gray-400">10x Faster</p>
          </div>
          <div className="text-center">
            <TrendingUp className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <p className="text-xs text-gray-400">2x Engagement</p>
          </div>
          <div className="text-center">
            <Sparkles className="w-6 h-6 text-violet-400 mx-auto mb-2" />
            <p className="text-xs text-gray-400">AI-Powered</p>
          </div>
        </motion.div>
      </div>

      {/* Social Auth Options */}
      <Card className="bg-gray-900/60 backdrop-blur-xl border-gray-800/30">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-xl">Get Started in Seconds</CardTitle>
          <CardDescription>Connect your social account for instant setup</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={() => handleSocialAuth('twitter')}
            variant="outline"
            className="w-full bg-[#1DA1F2]/10 border-[#1DA1F2]/30 hover:bg-[#1DA1F2]/20 text-white"
            disabled={isLoading}
          >
            <Twitter className="w-4 h-4 mr-2" />
            Continue with Twitter/X
          </Button>
          
          <Button
            onClick={() => handleSocialAuth('linkedin')}
            variant="outline"
            className="w-full bg-[#0077B5]/10 border-[#0077B5]/30 hover:bg-[#0077B5]/20 text-white"
            disabled={isLoading}
          >
            <Linkedin className="w-4 h-4 mr-2" />
            Continue with LinkedIn
          </Button>
          
          <Button
            onClick={() => handleSocialAuth('instagram')}
            variant="outline"
            className="w-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30 hover:from-purple-500/20 hover:to-pink-500/20 text-white"
            disabled={isLoading}
          >
            <Instagram className="w-4 h-4 mr-2" />
            Continue with Instagram
          </Button>
        </CardContent>
      </Card>

      {/* Email Fallback */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-800" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-gray-500">Or continue with email</span>
        </div>
      </div>

      <Card className="bg-gray-900/60 backdrop-blur-xl border-gray-800/30">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Enter your full name"
                className="bg-gray-800/50 border-gray-700"
              />
              {errors.name && (
                <p className="text-sm text-red-400 mt-1">{errors.name.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="Enter your email address"
                className="bg-gray-800/50 border-gray-700"
              />
              {errors.email && (
                <p className="text-sm text-red-400 mt-1">{errors.email.message}</p>
              )}
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              <Mail className="w-4 h-4 mr-2" />
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-xs text-gray-500 text-center">
        By continuing, you agree to our Terms of Service and Privacy Policy
      </p>
    </motion.div>
  );
}