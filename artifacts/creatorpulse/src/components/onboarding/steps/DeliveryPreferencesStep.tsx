import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, MessageSquare, Clock, Calendar, Sparkles, CheckCircle, Rocket, Loader2 } from 'lucide-react';
import { useOnboardingStore } from '@/store/onboardingStore';

const deliverySchema = z.object({
  deliveryTime: z.string().min(1, 'Please select a delivery time'),
  frequency: z.string().min(1, 'Please select a frequency'),
  channels: z.array(z.string()).min(1, 'Please select at least one delivery channel'),
  timezone: z.string().min(1, 'Please select your timezone'),
});

type DeliveryFormData = z.infer<typeof deliverySchema>;

const deliveryTimes = [
  { value: '06:00', label: '6:00 AM', description: 'Early bird special' },
  { value: '08:00', label: '8:00 AM', description: 'Most popular', recommended: true },
  { value: '10:00', label: '10:00 AM', description: 'Mid-morning focus' },
  { value: '12:00', label: '12:00 PM', description: 'Lunch break' },
  { value: '18:00', label: '6:00 PM', description: 'End of workday' },
  { value: '20:00', label: '8:00 PM', description: 'Evening planning' },
];

const frequencies = [
  { value: 'daily', label: 'Daily', description: 'Monday to Friday', icon: Calendar },
  { value: 'weekly', label: 'Weekly', description: 'Every Monday', icon: Clock },
];

const deliveryChannels = [
  {
    value: 'email',
    label: 'Email',
    description: 'Professional daily briefing',
    icon: Mail,
    iconBg: 'bg-primary',
  },
  {
    value: 'whatsapp',
    label: 'WhatsApp',
    description: 'Quick mobile updates',
    icon: MessageSquare,
    iconBg: 'bg-emerald-500',
  },
];

const commonTimezones = [
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

export function DeliveryPreferencesStep() {
  const {
    deliveryPrefs,
    updateDeliveryPrefs,
    prevStep,
    completeOnboarding,
    isLoading
  } = useOnboardingStore();

  const navigate = useNavigate();
  const [isGeneratingFirstDraft, setIsGeneratingFirstDraft] = useState(false);
  const [firstDraftGenerated, setFirstDraftGenerated] = useState(false);

  const { control, handleSubmit, formState: { errors }, watch, setValue } = useForm<DeliveryFormData>({
    resolver: zodResolver(deliverySchema),
    defaultValues: deliveryPrefs,
  });

  const selectedChannels = watch('channels') || [];

  const onSubmit = async (data: DeliveryFormData) => {
    updateDeliveryPrefs(data);
    setIsGeneratingFirstDraft(true);
    await new Promise(resolve => setTimeout(resolve, 2500));
    setFirstDraftGenerated(true);
    setIsGeneratingFirstDraft(false);
    await completeOnboarding();
    setTimeout(() => navigate('/dashboard'), 1500);
  };

  const toggleChannel = (channelValue: string) => {
    const current = selectedChannels;
    const updated = current.includes(channelValue)
      ? current.filter(c => c !== channelValue)
      : [...current, channelValue];
    setValue('channels', updated);
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
        <h2 className="text-2xl font-bold text-foreground mb-2">Set up your daily pulse</h2>
        <p className="text-muted-foreground text-sm">
          Configure when and how you want to receive your AI-generated content drafts
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Delivery Time */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="w-4 h-4 text-primary" />
              When should we deliver your daily pulse?
            </CardTitle>
            <CardDescription>
              Choose the time that works best for your content planning routine
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Controller
              name="deliveryTime"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-3">
                  {deliveryTimes.map((time) => {
                    const isSelected = field.value === time.value;
                    return (
                      <Card
                        key={time.value}
                        className={`cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? 'border-primary ring-1 ring-primary/20 bg-primary/5'
                            : 'hover:border-primary/30'
                        }`}
                        onClick={() => field.onChange(time.value)}
                      >
                        <CardContent className="p-3 text-center">
                          <h3 className="font-semibold text-sm text-foreground">{time.label}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{time.description}</p>
                          {time.recommended && (
                            <Badge className="mt-2 bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                              Recommended
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            />
            {errors.deliveryTime && (
              <p className="text-sm text-destructive mt-2">{errors.deliveryTime.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Frequency */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="w-4 h-4 text-accent" />
              How often would you like content drafts?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Controller
              name="frequency"
              control={control}
              render={({ field }) => (
                <div className="grid gap-3">
                  {frequencies.map((freq) => {
                    const IconComponent = freq.icon;
                    const isSelected = field.value === freq.value;
                    return (
                      <Card
                        key={freq.value}
                        className={`cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? 'border-accent ring-1 ring-accent/20 bg-accent/5'
                            : 'hover:border-accent/30'
                        }`}
                        onClick={() => field.onChange(freq.value)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              isSelected ? 'bg-accent text-white' : 'bg-muted text-muted-foreground'
                            }`}>
                              <IconComponent className="w-4 h-4" />
                            </div>
                            <div>
                              <h3 className="font-medium text-foreground text-sm">{freq.label}</h3>
                              <p className="text-xs text-muted-foreground">{freq.description}</p>
                            </div>
                            {isSelected && <CheckCircle className="w-4 h-4 text-accent ml-auto" />}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            />
            {errors.frequency && (
              <p className="text-sm text-destructive mt-2">{errors.frequency.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Delivery Channels */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">How would you like to receive your content?</CardTitle>
            <CardDescription>Select your preferred delivery channels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {deliveryChannels.map((channel) => {
                const IconComponent = channel.icon;
                const isSelected = selectedChannels.includes(channel.value);
                return (
                  <Card
                    key={channel.value}
                    className={`cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'border-primary ring-1 ring-primary/20 bg-primary/5'
                        : 'hover:border-primary/30'
                    }`}
                    onClick={() => toggleChannel(channel.value)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-lg ${channel.iconBg}`}>
                            <IconComponent className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <h3 className="font-medium text-sm text-foreground">{channel.label}</h3>
                            <p className="text-xs text-muted-foreground">{channel.description}</p>
                          </div>
                        </div>
                        {isSelected && <CheckCircle className="w-4 h-4 text-primary" />}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {errors.channels && (
              <p className="text-sm text-destructive mt-2">{errors.channels.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Timezone */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Your Timezone</CardTitle>
          </CardHeader>
          <CardContent>
            <Controller
              name="timezone"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {commonTimezones.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.timezone && (
              <p className="text-sm text-destructive mt-2">{errors.timezone.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Generating First Draft */}
        {isGeneratingFirstDraft && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="shadow-sm border-primary/20 bg-primary/5">
              <CardContent className="p-6 text-center">
                <Loader2 className="w-10 h-10 mx-auto mb-3 text-primary animate-spin" />
                <h3 className="text-base font-bold text-foreground mb-1">Generating your first draft...</h3>
                <p className="text-sm text-muted-foreground">
                  Your AI is creating personalized content based on your voice training
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Success State */}
        {firstDraftGenerated && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="shadow-sm border-emerald-200 bg-emerald-50/50">
              <CardContent className="p-6 text-center">
                <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-foreground mb-1">Welcome to CreatorPulse!</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Your setup is complete and your first AI-generated draft is ready for review.
                </p>
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                  Setup Complete
                </Badge>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={prevStep} disabled={isGeneratingFirstDraft}>
            Back
          </Button>
          <Button
            type="submit"
            disabled={isGeneratingFirstDraft || isLoading}
            className="bg-primary hover:bg-primary/90"
          >
            {isGeneratingFirstDraft ? (
              <>
                <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                Generating Draft...
              </>
            ) : firstDraftGenerated ? (
              <>
                <Rocket className="w-4 h-4 mr-2" />
                Enter CreatorPulse
              </>
            ) : (
              'Complete Setup & Generate First Draft'
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
