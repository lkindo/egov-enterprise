import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';

/**
 * Card 컴포넌트 스토리
 * 
 * 컨테이너형 카드 컴포넌트의 다양한 활용 예시를 확인할 수 있습니다.
 */

const meta = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  subcomponents: {
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

// 기본 카드
export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card Description</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card Content goes here. You can add any content inside.</p>
      </CardContent>
      <CardFooter>
        <p>Card Footer</p>
      </CardFooter>
    </Card>
  ),
};

// 통계 카드
export const StatCard: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Total Users
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">2,543</div>
        <p className="text-xs text-green-600 mt-2">
          ↑ 20.1% from last month
        </p>
      </CardContent>
    </Card>
  ),
};

// 알림 카드
export const NotificationCard: Story = {
  render: () => (
    <Card className="w-[350px] border-l-4 border-l-blue-500">
      <CardHeader>
        <CardTitle className="text-lg">New Feature Available</CardTitle>
        <CardDescription>
          Check out the latest updates to improve your workflow.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">
          We've added new dashboard widgets, improved performance, and fixed several bugs.
        </p>
      </CardContent>
      <CardFooter className="flex gap-2">
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">
          Learn More
        </button>
        <button className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm">
          Dismiss
        </button>
      </CardFooter>
    </Card>
  ),
};

// 에러 카드
export const ErrorCard: Story = {
  render: () => (
    <Card className="w-[350px] border-l-4 border-l-red-500">
      <CardHeader>
        <CardTitle className="text-lg text-red-600">Error Occurred</CardTitle>
        <CardDescription>
          Something went wrong while processing your request.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Error Code: 500<br />
          Please try again later or contact support.
        </p>
      </CardContent>
      <CardFooter>
        <button className="px-4 py-2 bg-red-600 text-white rounded-md text-sm">
          Retry
        </button>
      </CardFooter>
    </Card>
  ),
};

// 프로필 카드
export const ProfileCard: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
            JD
          </div>
          <div>
            <CardTitle>John Doe</CardTitle>
            <CardDescription>Software Engineer</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Email</span>
            <span>john.doe@example.com</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Department</span>
            <span>Engineering</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Role</span>
            <span>Admin</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <button className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">
          Edit Profile
        </button>
        <button className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm">
          Message
        </button>
      </CardFooter>
    </Card>
  ),
};
