import { Metadata } from 'next';
import EventManagementClient from './EventManagementClient';

export const metadata: Metadata = {
  title: '행사 정보 관리 | eGov Enterprise System',
  description: '에고브 엔터프라이즈 통합 행사 및 운영 관리 센터',
};

export default function EventManagementPage() {
  return (
    <div className="container mx-auto py-10 px-4 md:px-8">
      <EventManagementClient />
    </div>
  );
}
