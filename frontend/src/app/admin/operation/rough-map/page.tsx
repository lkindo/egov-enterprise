import { Metadata } from 'next';
import RoughMapManagementClient from './RoughMapManagementClient';

export const metadata: Metadata = {
  title: '약도 관리 | eGov Enterprise System',
  description: '에고브 엔터프라이즈 공간 인텔리전스 및 약도 관리 센터',
};

export default function RoughMapPage() {
  return (
    <div className="container mx-auto py-10 px-4 md:px-8">
      <RoughMapManagementClient />
    </div>
  );
}
