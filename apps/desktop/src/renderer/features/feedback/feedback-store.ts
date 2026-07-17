import { create } from 'zustand';

interface FeedbackModeState {
  active: boolean;
  setActive: (active: boolean) => void;
  toggle: () => void;
}

export const useFeedbackModeStore = create<FeedbackModeState>((set) => ({
  active: false,
  setActive: (active) => set({ active }),
  toggle: () => set((state) => ({ active: !state.active })),
}));
