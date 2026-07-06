import type { Preview } from '@storybook/react';
import '../src/app/globals.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    // 다크 모드 설정
    darkMode: {
      stylePreview: true,
      lightClass: 'light',
      darkClass: 'dark',
    },
    // 레이아웃 설정
    layout: 'fullscreen',
    // 접근성 설정
    a11y: {
      element: '#root',
      config: {},
      options: {},
      manual: false,
    },
  },
  // 전역 데코레이터
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-background">
        <Story />
      </div>
    ),
  ],
  // 전역 args
  args: {},
};

export default preview;
