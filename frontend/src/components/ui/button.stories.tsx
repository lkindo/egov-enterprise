import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { Button } from './button';

/**
 * Button 而댄룷?뚰듃 ?ㅽ넗由? * 
 * ?ㅼ뼇님variant, size, ?곹깭님Button 님?뺤씤님님?덉뒿?덈떎.
 * Shadcn/UI 湲곕컲님?묎렐님?덈뒗 踰꾪듉 而댄룷?뚰듃?낅땲님
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

// 湲곕낯 踰꾪듉
export const Default: Story = {
  args: {
    variant: 'default',
    size: 'default',
    children: 'Button',
    disabled: false,
  },
};

// Destructive 踰꾪듉 (?꾪뿕님?숈옉)
export const Destructive: Story = {
  args: {
    variant: 'destructive',
    size: 'default',
    children: 'Delete',
  },
};

// Outline 踰꾪듉
export const Outline: Story = {
  args: {
    variant: 'outline',
    size: 'default',
    children: 'Outline',
  },
};

// Secondary 踰꾪듉
export const Secondary: Story = {
  args: {
    variant: 'secondary',
    size: 'default',
    children: 'Secondary',
  },
};

// Ghost 踰꾪듉
export const Ghost: Story = {
  args: {
    variant: 'ghost',
    size: 'default',
    children: 'Ghost',
  },
};

// Link 踰꾪듉
export const Link: Story = {
  args: {
    variant: 'link',
    size: 'default',
    children: 'Link',
  },
};

// Small 踰꾪듉
export const Small: Story = {
  args: {
    variant: 'default',
    size: 'sm',
    children: 'Small',
  },
};

// Large 踰꾪듉
export const Large: Story = {
  args: {
    variant: 'default',
    size: 'lg',
    children: 'Large',
  },
};

// Icon 踰꾪듉
export const Icon: Story = {
  args: {
    variant: 'outline',
    size: 'icon',
    children: '?뵇',
  },
};

// Disabled 踰꾪듉
export const Disabled: Story = {
  args: {
    variant: 'default',
    size: 'default',
    children: 'Disabled',
    disabled: true,
  },
};

// 紐⑤뱺 Variant ?쒕늿님蹂닿린
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

// 紐⑤뱺 Size ?쒕늿님蹂닿린
export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon">?뵇</Button>
    </div>
  ),
};
