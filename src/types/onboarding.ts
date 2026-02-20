export interface UserData {
  email?: string;
  name?: string;
  authProvider?: string;
}

export interface ProfileSetupData {
  industry: string;
  creatorType: string;
  platforms: string[];
  followerRange?: string;
}

export interface ContentSample {
  id: string;
  platform: string;
  content: string;
  url?: string;
  engagementMetrics?: {
    likes: number;
    comments: number;
    shares: number;
    views?: number;
  };
}

export interface DeliveryPreferences {
  deliveryTime: string;
  frequency: string;
  channels: string[];
  timezone: string;
}

export interface VoiceTrainingData {
  platform: string;
  samples: ContentSample[];
  analysisComplete: boolean;
  confidenceScore?: number;
}

export interface OnboardingState {
  currentStep: number;
  userData: UserData;
  profileData: ProfileSetupData;
  contentSamples: ContentSample[];
  deliveryPrefs: DeliveryPreferences;
  voiceTraining: VoiceTrainingData[];
  isLoading: boolean;
  error?: string;
}

export interface OnboardingActions {
  setStep: (step: number) => void;
  updateUserData: (data: Partial<UserData>) => void;
  updateProfileData: (data: Partial<ProfileSetupData>) => void;
  addContentSample: (sample: ContentSample) => void;
  removeContentSample: (id: string) => void;
  updateDeliveryPrefs: (prefs: Partial<DeliveryPreferences>) => void;
  updateVoiceTraining: (data: VoiceTrainingData) => void;
  setLoading: (loading: boolean) => void;
  setError: (error?: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  reset: () => void;
  saveProgress: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

export type OnboardingStore = OnboardingState & OnboardingActions;