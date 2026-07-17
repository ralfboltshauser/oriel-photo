import * as astroPlugin from 'prettier-plugin-astro';

export default {
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 96,
  plugins: [astroPlugin],
  overrides: [
    {
      files: '*.astro',
      options: {
        parser: 'astro',
      },
    },
  ],
};
