import { Metadata } from 'next';
import EventManagementClient from './EventManagementClient';

export const metadata: Metadata = {
  title: '?됱궗 ?뺣낫 愿由?| eGov Enterprise System',
  description: '?먭퀬釉님뷀꽣?꾨씪?댁쫰 ?듯빀 ?됱궗 諛님댁쁺 愿由님쇳꽣',
};

export default function EventManagementPage() {
  return (
    <div className="container mx-auto py-10 px-4 md:px-8">
      <EventManagementClient />
    </div>
  );
}

