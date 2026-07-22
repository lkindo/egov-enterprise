import { Metadata } from 'next';
import RoughMapManagementClient from './RoughMapManagementClient';

export const metadata: Metadata = {
  title: '약도 관리 | eGov Enterprise System',
  description: '에고브 엔터프라이즈 공간 인텔리전스 및 약도 관리 센터',
};

export default function RoughMapPage() {
  // 루트 레이아웃이 이미 `max-w-7xl p-6/md:p-12/lg:p-16` 을 제공하므로 화면별 이중 여백을 두지 않는다.
  return <RoughMapManagementClient />;
}
