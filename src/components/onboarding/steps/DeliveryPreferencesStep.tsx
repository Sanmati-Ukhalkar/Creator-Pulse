import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, MessageSquare, Clock, Calendar, Sparkles, CheckCircle, Rocket } from 'lucide-react';
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
  { value: '08:00', label: '8:00 AM', description: 'Most popular' },
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
    color: 'from-blue-500 to-cyan-500',
  },
  {
    value: 'whatsapp',
    label: 'WhatsApp',
    description: 'Quick mobile updates',
    icon: MessageSquare,
    color: 'from-green-500 to-emerald-500',
  },
];

const commonTimezones = [
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
  'America/Chicago',
];

export function DeliveryPreferencesStep() {
  const { 
    deliveryPrefs, 
    updateDeliveryPrefs, 
    nextStep, 
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
    
    // Generate first draft
    setIsGeneratingFirstDraft(true);
    await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate API call
    setFirstDraftGenerated(true);
    setIsGeneratingFirstDraft(false);
    
    // Complete onboarding
    await completeOnboarding();
    
    // Redirect to dashboard after a brief delay to show success state
    setTimeout(() => {
      navigate('/dashboard');
    }, 2000);
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
      transition={{ duration: 0.5 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Set up your daily pulse</h2>
        <p className="text-gray-400">
          Configure when and how you want to receive your AI-generated content drafts
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Delivery Time */}
        <Card className="bg-gray-900/60 backdrop-blur-xl border-gray-800/30">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2 text-cyan-400" />
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
                      <motion.div
                        key={time.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Card
                          className={`cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? 'bg-cyan-500/20 border-cyan-500'
                              : 'bg-gray-800/30 border-gray-700 hover:border-gray-600'
                          }`}
                          onClick={() => field.onChange(time.value)}
                        >
                          <CardContent className="p-4 text-center">
                            <h3 className="font-medium">{time.label}</h3>
                            <p className="text-xs text-gray-400 mt-1">{time.description}</p>
                            {time.value === '08:00' && (
                              <Badge className="mt-2 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                Recommended
                              </Badge>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            />
            {errors.deliveryTime && (
              <p className="text-sm text-red-400 mt-2">{errors.deliveryTime.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Frequency */}
        <Card className="bg-gray-900/60 backdrop-blur-xl border-gray-800/30">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-violet-400" />
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
                      <motion.div
                        key={freq.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Card
                          className={`cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? 'bg-violet-500/20 border-violet-500'
                              : 'bg-gray-800/30 border-gray-700 hover:border-gray-600'
                          }`}
                          onClick={() => field.onChange(freq.value)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center">
                              <div className={`p-2 rounded-lg mr-3 ${
                                isSelected ? 'bg-violet-500/20' : 'bg-gray-700'
                              }`}>
                                <IconComponent className={`w-5 h-5 ${
                                  isSelected ? 'text-violet-400' : 'text-gray-400'
                                }`} />
                              </div>
                              <div>
                                <h3 className="font-medium">{freq.label}</h3>
                                <p className="text-sm text-gray-400">{freq.description}</p>
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
            {errors.frequency && (
              <p className="text-sm text-red-400 mt-2">{errors.frequency.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Delivery Channels */}
        <Card className="bg-gray-900/60 backdrop-blur-xl border-gray-800/30">
          <CardHeader>
            <CardTitle>How would you like to receive your content?</CardTitle>
            <CardDescription>Select your preferred delivery channels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {deliveryChannels.map((channel) => {
                const IconComponent = channel.icon;
                const isSelected = selectedChannels.includes(channel.value);
                return (
                  <motion.div
                    key={channel.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card
                      className={`cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'bg-gray-700/50 border-gray-500'
                          : 'bg-gray-800/30 border-gray-700 hover:border-gray-600'
                      }`}
                      onClick={() => toggleChannel(channel.value)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className={`p-3 rounded-lg mr-3 bg-gradient-to-r ${channel.color}`}>
                              <IconComponent className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h3 className="font-medium">{channel.label}</h3>
                              <p className="text-sm text-gray-400">{channel.description}</p>
                            </div>
                          </div>
                          {isSelected && (
                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
            {errors.channels && (
              <p className="text-sm text-red-400 mt-2">{errors.channels.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Timezone */}
        <Card className="bg-gray-900/60 backdrop-blur-xl border-gray-800/30">
          <CardHeader>
            <CardTitle>Your Timezone</CardTitle>
          </CardHeader>
          <CardContent>
            <Controller
              name="timezone"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="bg-gray-800/50 border-gray-700">
                    <SelectValue placeholder="Select your timezone" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
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
              <p className="text-sm text-red-400 mt-2">{errors.timezone.message}</p>
            )}
          </CardContent>
        </Card>

        {/* First Draft Generation */}
        {isGeneratingFirstDraft && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border-cyan-500/30">
              <CardContent className="p-6 text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-12 h-12 mx-auto mb-4"
                >
                  <Sparkles className="w-12 h-12 text-cyan-400" />
                </motion.div>
                <h3 className="text-lg font-bold mb-2">Generating your first draft...</h3>
                <p className="text-gray-400">
                  Your AI is creating personalized content based on your voice training
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Success State */}
        {firstDraftGenerated && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/30">
              <CardContent className="p-6 text-center">
                <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Welcome to CreatorPulse!</h3>
                <p className="text-gray-400 mb-4">
                  Your setup is complete and your first AI-generated draft is ready for review.
                </p>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
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
            className="bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-700 hover:to-violet-700"
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