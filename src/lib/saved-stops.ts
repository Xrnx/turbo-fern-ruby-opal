import { create } from "zustand";
import { persist } from "zustand/middleware";

const MAX_RECENTS = 8;

type SavedState = {
  saved: string[];
  recents: string[];
  toggleSaved: (code: string) => void;
  addRecent: (code: string) => void;
  isSaved: (code: string) => boolean;
};

export const useSavedStops = create<SavedState>()(
  persist(
    (set, get) => ({
      saved: [],
      recents: [],
      isSaved: (code) => get().saved.includes(code),
      toggleSaved: (code) =>
        set((state) => ({
          saved: state.saved.includes(code)
            ? state.saved.filter((c) => c !== code)
            : [code, ...state.saved],
        })),
      addRecent: (code) =>
        set((state) => ({
          recents: [code, ...state.recents.filter((c) => c !== code)].slice(0, MAX_RECENTS),
        })),
    }),
    { name: "halt-stops" },
  ),
);
