import { Metadata } from 'next';
import RoughMapManagementClient from './RoughMapManagementClient';

export const metadata: Metadata = {
  title: '?쎈룄 愿由?| eGov Enterprise System',
  description: '?먭퀬釉님뷀꽣?꾨씪?댁쫰 怨듦컙 ?명뀛由ъ쟾님諛님쎈룄 愿由님쇳꽣',
};

export default function RoughMapPage() {
  return (
    <div className="container mx-auto py-10 px-4 md:px-8">
      <RoughMapManagementClient />
    </div>
  );
}

