import type { Translation } from './fr';

export const en: Translation = {
  app: {
    name: 'Guess the Word',
  },
  common: {
    wip: 'Screen under construction',
    back: 'Back',
  },
  screens: {
    home: 'Home',
    categories: 'Categories',
    categoryDetail: 'Category',
    playSetup: 'Game setup',
    playReady: 'Put the phone on your forehead',
    playGame: 'Game',
    playResults: 'Results',
    create: 'My categories',
    editor: 'Create a category',
    tutorial: 'How to play',
    settings: 'Settings',
    devSkia: 'Skia test (dev)',
  },
  dev: {
    skiaHint:
      'If the gradient shows and the disc breathes, Skia and Reanimated work in this build.',
  },
  errors: {
    unexpected: 'Oops, something went wrong. Please restart the app.',
  },
};
