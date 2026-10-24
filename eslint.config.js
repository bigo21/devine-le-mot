// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: ['dist/*', '.expo/*', 'android/*', 'ios/*'],
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      // Metro n'élimine pas le code mort : l'import racine embarquerait les 1 512 icônes.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'phosphor-react-native',
              message:
                "Importer chaque icône seule : import { PlayIcon } from 'phosphor-react-native/src/icons/Play'.",
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
]);
