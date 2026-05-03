import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Users, Building2, Briefcase, Monitor, Heart, GraduationCap, Gamepad2 } from 'lucide-react';
import { useOnboardingStore } from '@/store/onboardingStore';

const profileSchema = z.object({
  industry: z.string().min(1, 'Please select an industry'),
  creatorType: z.string().min(1, 'Please select your creator type'),
  platforms: z.array(z.string()).min(1, 'Please select at least one platform'),
  followerRange: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const industries = [
  { value: 'tech', label: 'Tech & AI', icon: Monitor },
  { value: 'business', label: 'Business & Finance', icon: Briefcase },
  { value: 'lifestyle', label: 'Lifestyle & Wellness', icon: Heart },
  { value: 'marketing', label: 'Marketing & Sales', icon: Users },
  { value: 'entertainment', label: 'Entertainment & Media', icon: Gamepad2 },
  { value: 'education', label: 'Education & Learning', icon: GraduationCap },
];

const creatorTypes = [
  {
    value: 'solo',
    title: 'Solo Creator',
    description: 'Individual content creator building personal brand',
    icon: User,
    gradient: 'from-cyan-500 to-blue-500',
  },
  {
    value: 'growing',
    title: 'Growing Creator',
    description: 'Scaling content operation and audience',
    icon: Users,
    gradient: 'from-violet-500 to-purple-500',
  },
  {
    value: 'brand',
    title: 'Brand Manager',
    description: 'Managing content for company or organization',
    icon: Building2,
    gradient: 'from-emerald-500 to-teal-500',
  },
];

const platforms = [
  { value: 'twitter', label: 'Twitter/X', color: 'bg-[#1DA1F2]' },
  { value: 'linkedin', label: 'LinkedIn', color: 'bg-[#0077B5]' },
  { value: 'instagram', label: 'Instagram', color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
  { value: 'youtube', label: 'YouTube', color: 'bg-[#FF0000]' },
  { value: 'tiktok', label: 'TikTok', color: 'bg-black' },
  { value: 'threads', label: 'Threads', color: 'bg-black' },
];

export function ProfileSetupStep() {
  const { profileData, updateProfileData, nextStep, prevStep, isLoading } = useOnboardingStore();

  const { control, handleSubmit, formState: { errors }, watch, setValue } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: profileData,
  });

  const selectedPlatforms = watch('platforms') || [];

  const onSubmit = async (data: ProfileFormData) => {
    console.log('[Onboarding] Form submitted with data:', data);
    try {
      useOnboardingStore.getState().setLoading(true);
      updateProfileData(data);
      await useOnboardingStore.getState().saveProgress();
      nextStep();
    } catch (error) {
      console.error('[Onboarding] Failed to save progress:', error);
    } finally {
      useOnboardingStore.getState().setLoading(false);
    }
  };

  // Debug: log any validation errors
  const onError = (errors: any) => {
    console.error('[Onboarding] Form validation errors:', errors);
  };

  const togglePlatform = (platformValue: string) => {
    const current = selectedPlatforms;
    const updated = current.includes(platformValue)
      ? current.filter(p => p !== platformValue)
      : [...current, platformValue];
    setValue('platforms', updated);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.5 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Tell us about yourself</h2>
        <p className="text-gray-400">Help us personalize your AI content generation</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">
        {/* Industry Selection */}
        <Card className="bg-gray-900/60 backdrop-blur-xl border-gray-800/30">
          <CardHeader>
            <CardTitle>What industry do you create content in?</CardTitle>
            <CardDescription>This helps us understand your content style and audience</CardDescription>
          </CardHeader>
          <CardContent>
            <Controller
              name="industry"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="bg-gray-800/50 border-gray-700">
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    {industries.map((industry) => {
                      const IconComponent = industry.icon;
                      return (
                        <SelectItem key={industry.value} value={industry.value}>
                          <div className="flex items-center">
                            <IconComponent className="w-4 h-4 mr-2 text-gray-400" />
                            {industry.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.industry && (
              <p className="text-sm text-red-400 mt-1">{errors.industry.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Creator Type Selection */}
        <Card className="bg-gray-900/60 backdrop-blur-xl border-gray-800/30">
          <CardHeader>
            <CardTitle>What type of creator are you?</CardTitle>
            <CardDescription>Choose the option that best describes your content creation setup</CardDescription>
          </CardHeader>
          <CardContent>
            <Controller
              name="creatorType"
              control={control}
              render={({ field }) => (
                <div className="grid gap-3">
                  {creatorTypes.map((type) => {
                    const IconComponent = type.icon;
                    const isSelected = field.value === type.value;
                    return (
                      <motion.div
                        key={type.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Card
                          className={`cursor-pointer transition-all duration-200 ${isSelected
                            ? 'bg-gradient-to-r ' + type.gradient + ' border-transparent'
                            : 'bg-gray-800/30 border-gray-700 hover:border-gray-600'
                            }`}
                          onClick={() => field.onChange(type.value)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start space-x-3">
                              <div className={`p-2 rounded-lg ${isSelected ? 'bg-white/20' : 'bg-gray-700'}`}>
                                <IconComponent className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-gray-400'}`} />
                              </div>
                              <div className="flex-1">
                                <h3 className={`font-medium ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                                  {type.title}
                                </h3>
                                <p className={`text-sm ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                                  {type.description}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            />
            {errors.creatorType && (
              <p className="text-sm text-red-400 mt-1">{errors.creatorType.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Platform Selection */}
        <Card className="bg-gray-900/60 backdrop-blur-xl border-gray-800/30">
          <CardHeader>
            <CardTitle>Which platforms do you create content for?</CardTitle>
            <CardDescription>Select all platforms where you're active (you can add more later)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {platforms.map((platform) => {
                const isSelected = selectedPlatforms.includes(platform.value);
                return (
                  <motion.div
                    key={platform.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card
                      className={`cursor-pointer transition-all duration-200 ${isSelected
                        ? 'bg-gray-700/50 border-cyan-500'
                        : 'bg-gray-800/30 border-gray-700 hover:border-gray-600'
                        }`}
                      onClick={() => togglePlatform(platform.value)}
                    >
                      <CardContent className="p-4 text-center">
                        <div className={`w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center ${platform.color}`}>
                          <span className="text-white text-xs font-bold">
                            {platform.label.charAt(0)}
                          </span>
                        </div>
                        <p className="text-sm font-medium">{platform.label}</p>
                        {isSelected && (
                          <Badge className="mt-2 bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                            Selected
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
            {errors.platforms && (
              <p className="text-sm text-red-400 mt-1">{errors.platforms.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={prevStep}>
            Back
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Continue'}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}