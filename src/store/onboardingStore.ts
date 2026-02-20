import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OnboardingStore, UserData, ProfileSetupData, ContentSample, DeliveryPreferences, VoiceTrainingData } from '@/types/onboarding';
import { api } from '@/lib/api';

const initialState = {
  currentStep: 1,
  userData: {},
  profileData: {
    industry: '',
    creatorType: '',
    platforms: [],
  },
  contentSamples: [],
  deliveryPrefs: {
    deliveryTime: '08:00',
    frequency: 'daily',
    channels: ['email'],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  },
  voiceTraining: [],
  isLoading: false,
  error: undefined,
};

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setStep: (step) => set({ currentStep: step }),

      updateUserData: (data) =>
        set((state) => ({
          userData: { ...state.userData, ...data }
        })),

      updateProfileData: (data) =>
        set((state) => ({
          profileData: { ...state.profileData, ...data }
        })),

      addContentSample: (sample) =>
        set((state) => ({
          contentSamples: [...state.contentSamples, sample]
        })),

      removeContentSample: (id) =>
        set((state) => ({
          contentSamples: state.contentSamples.filter(s => s.id !== id)
        })),

      updateDeliveryPrefs: (prefs) =>
        set((state) => ({
          deliveryPrefs: { ...state.deliveryPrefs, ...prefs }
        })),

      updateVoiceTraining: (data) =>
        set((state) => {
          const existing = state.voiceTraining.findIndex(v => v.platform === data.platform);
          if (existing >= 0) {
            const updated = [...state.voiceTraining];
            updated[existing] = data;
            return { voiceTraining: updated };
          }
          return { voiceTraining: [...state.voiceTraining, data] };
        }),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      nextStep: () =>
        set((state) => ({
          currentStep: Math.min(state.currentStep + 1, 5)
        })),

      prevStep: () =>
        set((state) => ({
          currentStep: Math.max(state.currentStep - 1, 1)
        })),

      reset: () => set(initialState),

      saveProgress: async () => {
        const state = get();
        try {
          const token = localStorage.getItem('auth_token');
          if (!token) return;

          // Persist partial profile progress
          if (state.profileData && (state.profileData.industry || state.profileData.creatorType)) {
            await api.put('/profile', {
              industry: state.profileData.industry,
              creator_type: state.profileData.creatorType,
              platforms: state.profileData.platforms,
            });
          }
        } catch (e) {
          // Swallow autosave errors silently
        }
      },

      completeOnboarding: async () => {
        const state = get();
        try {
          set({ isLoading: true });

          const token = localStorage.getItem('auth_token');
          if (!token) {
            throw new Error('Not authenticated');
          }

          await api.post('/profile/onboarding', {
            profileData: state.profileData,
            contentSamples: state.contentSamples,
            deliveryPrefs: state.deliveryPrefs
          });

          set({ isLoading: false });
        } catch (error) {
          set({ error: 'Failed to complete onboarding. Please try again.', isLoading: false });
        }
      },
    }),
    {
      name: 'creatorpulse-onboarding',
      partialize: (state) => ({
        currentStep: state.currentStep,
        userData: state.userData,
        profileData: state.profileData,
        contentSamples: state.contentSamples,
        deliveryPrefs: state.deliveryPrefs,
        voiceTraining: state.voiceTraining,
      }),
    }
  )
);