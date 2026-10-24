import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  Unbounded_700Bold,
  Unbounded_800ExtraBold,
  Unbounded_900Black,
} from '@expo-google-fonts/unbounded';

import type { fonts } from '@/ui/tokens';

// Les clés doivent correspondre aux noms utilisés dans `fonts` (tokens).
export const fontAssets: Record<(typeof fonts)[keyof typeof fonts], number> = {
  Unbounded_700Bold,
  Unbounded_800ExtraBold,
  Unbounded_900Black,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
};
