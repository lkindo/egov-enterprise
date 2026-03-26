import { Metadata } from 'next';
import MemoReportManagementClient from './MemoReportManagementClient';

export const metadata: Metadata = {
  title: '메모보고 관리 | eGov Enterprise System',
  description: '에고브 엔터프라이즈 통합 커뮤니케이션 및 비정형 보고 관리 센터',
};

export default function MemoReportPage() {
  return (
    <div className="container mx-auto py-10 px-4 md:px-8">
      <MemoReportManagementClient />
    </div>
  );
}
