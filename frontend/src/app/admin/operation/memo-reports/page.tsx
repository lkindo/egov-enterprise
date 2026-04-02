import { Metadata } from 'next';
import MemoReportManagementClient from './MemoReportManagementClient';

export const metadata: Metadata = {
  title: '硫붾え蹂닿퀬 관리| eGov Enterprise System',
  description: '?먭퀬釉님뷀꽣?꾨씪?댁쫰 ?듯빀 而ㅻ님덉님댁뀡 및 鍮꾩젙님蹂닿퀬 관리님쇳꽣',
};

export default function MemoReportPage() {
  return (
    <div className="container mx-auto py-10 px-4 md:px-8">
      <MemoReportManagementClient />
    </div>
  );
}

