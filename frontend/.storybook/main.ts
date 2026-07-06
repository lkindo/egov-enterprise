import type { StorybookConfig } from '@storybook/nextjs';

const config: StorybookConfig = {
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../src/components/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-onboarding',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    '@storybook/addon-themes',
    {
      name: '@storybook/addon-styling-webpack',
      options: {
        postCss: true,
      },
    },
  ],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  staticDirs: ['../public'],
  // Next.js 설정 통합
  nextjs: {
    appDirectory: true,
    skipWebpackCache: true,
  },
  // 다크 모드 지원
  previewHead: (head) => `
    ${head}
    <script>
      // Check for dark mode preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      }
    </script>
  `,
};

export default config;
