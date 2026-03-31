import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { Button } from './button';

/**
 * Button 컴포넌트 스토리
 * 
 * 다양한 variant, size, 상태의 Button 을 확인할 수 있습니다.
 * Shadcn/UI 기반의 접근성 있는 버튼 컴포넌트입니다.
 */

const meta = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    a11y: {
      element: '#storybook-root',
      config: {},
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
    disabled: {
      control: 'boolean',
    },
    children: {
      control: 'text',
    },
  },
  args: { onClick: fn() },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// 기본 버튼
export const Default: Story = {
  args: {
    variant: 'default',
    size: 'default',
    children: 'Button',
    disabled: false,
  },
};

// Destructive 버튼 (위험한 동작)
export const Destructive: Story = {
  args: {
    variant: 'destructive',
    size: 'default',
    children: 'Delete',
  },
};

// Outline 버튼
export const Outline: Story = {
  args: {
    variant: 'outline',
    size: 'default',
    children: 'Outline',
  },
};

// Secondary 버튼
export const Secondary: Story = {
  args: {
    variant: 'secondary',
    size: 'default',
    children: 'Secondary',
  },
};

// Ghost 버튼
export const Ghost: Story = {
  args: {
    variant: 'ghost',
    size: 'default',
    children: 'Ghost',
  },
};

// Link 버튼
export const Link: Story = {
  args: {
    variant: 'link',
    size: 'default',
    children: 'Link',
  },
};

// Small 버튼
export const Small: Story = {
  args: {
    variant: 'default',
    size: 'sm',
    children: 'Small',
  },
};

// Large 버튼
export const Large: Story = {
  args: {
    variant: 'default',
    size: 'lg',
    children: 'Large',
  },
};

// Icon 버튼
export const Icon: Story = {
  args: {
    variant: 'outline',
    size: 'icon',
    children: '🔍',
  },
};

// Disabled 버튼
export const Disabled: Story = {
  args: {
    variant: 'default',
    size: 'default',
    children: 'Disabled',
    disabled: true,
  },
};

// 모든 Variant 한눈에 보기
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="default">Default</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
};

// 모든 Size 한눈에 보기
export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon">🔍</Button>
    </div>
  ),
};
