import Storage from 'expo-sqlite/kv-store';
import { createJSONStorage } from 'zustand/middleware';

/** Stockage des préférences (expo-sqlite/kv-store), branché sur la persistance Zustand. */
export const persistStorage = createJSONStorage(() => Storage);
