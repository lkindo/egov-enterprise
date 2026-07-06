import { Metadata } from 'next';
import RoughMapManagementClient from './RoughMapManagementClient';

export const metadata: Metadata = {
  title: '?쎈룄 관리| eGov Enterprise System',
  description: '?먭퀬釉님뷀꽣?꾨씪?댁쫰 怨듦컙 인텔리전스諛님쎈룄 관리님쇳꽣',
};

export default function RoughMapPage() {
  return (
    <div className="container mx-auto py-10 px-4 md:px-8">
      <RoughMapManagementClient />
    </div>
  );
}

