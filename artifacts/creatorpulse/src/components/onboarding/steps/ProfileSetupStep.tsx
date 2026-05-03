import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Users, Building2, Briefcase, Monitor, Heart, GraduationCap, Gamepad2, CheckCircle } from 'lucide-react';
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
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    value: 'growing',
    title: 'Growing Creator',
    description: 'Scaling content operation and audience',
    icon: Users,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
  },
  {
    value: 'brand',
    title: 'Brand Manager',
    description: 'Managing content for company or organization',
    icon: Building2,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
];

const platforms = [
  { value: 'twitter', label: 'Twitter/X', color: 'bg-slate-800' },
  { value: 'linkedin', label: 'LinkedIn', color: 'bg-blue-600' },
  { value: 'instagram', label: 'Instagram', color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
  { value: 'youtube', label: 'YouTube', color: 'bg-red-600' },
  { value: 'tiktok', label: 'TikTok', color: 'bg-slate-900' },
  { value: 'threads', label: 'Threads', color: 'bg-slate-900' },
];

export function ProfileSetupStep() {
  const { profileData, updateProfileData, nextStep, prevStep, isLoading } = useOnboardingStore();

  const { control, handleSubmit, formState: { errors }, watch, setValue } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: profileData,
  });

  const selectedPlatforms = watch('platforms') || [];

  const onSubmit = async (data: ProfileFormData) => {
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
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">Tell us about yourself</h2>
        <p className="text-muted-foreground text-sm">Help us personalize your AI content generation</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">
        {/* Industry Selection */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">What industry do you create content in?</CardTitle>
            <CardDescription>This helps us understand your content style and audience</CardDescription>
          </CardHeader>
          <CardContent>
            <Controller
              name="industry"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map((industry) => {
                      const IconComponent = industry.icon;
                      return (
                        <SelectItem key={industry.value} value={industry.value}>
                          <div className="flex items-center">
                            <IconComponent className="w-4 h-4 mr-2 text-muted-foreground" />
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
              <p className="text-sm text-destructive mt-1">{errors.industry.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Creator Type Selection */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">What type of creator are you?</CardTitle>
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
                      <Card
                        key={type.value}
                        className={`cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? 'border-primary ring-1 ring-primary/20 bg-primary/5'
                            : 'hover:border-primary/30'
                        }`}
                        onClick={() => field.onChange(type.value)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary text-white' : `${type.bg} ${type.color}`}`}>
                              <IconComponent className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium text-foreground">{type.title}</h3>
                              <p className="text-sm text-muted-foreground">{type.description}</p>
                            </div>
                            {isSelected && <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            />
            {errors.creatorType && (
              <p className="text-sm text-destructive mt-1">{errors.creatorType.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Platform Selection */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Which platforms do you create content for?</CardTitle>
            <CardDescription>Select all platforms where you're active (you can add more later)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {platforms.map((platform) => {
                const isSelected = selectedPlatforms.includes(platform.value);
                return (
                  <Card
                    key={platform.value}
                    className={`cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'border-primary ring-1 ring-primary/20 bg-primary/5'
                        : 'hover:border-primary/30'
                    }`}
                    onClick={() => togglePlatform(platform.value)}
                  >
                    <CardContent className="p-4 text-center">
                      <div className={`w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center ${platform.color}`}>
                        <span className="text-white text-xs font-bold">
                          {platform.label.charAt(0)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground">{platform.label}</p>
                      {isSelected && (
                        <Badge className="mt-2 bg-primary/10 text-primary border-primary/20">
                          Selected
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {errors.platforms && (
              <p className="text-sm text-destructive mt-1">{errors.platforms.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={prevStep}>Back</Button>
          <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90">
            {isLoading ? 'Saving...' : 'Continue'}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
