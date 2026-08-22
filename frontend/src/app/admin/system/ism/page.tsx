import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { ismAdminService, InformalSanctionDto } from '@/services/foundation/system/IsmAdminService';
import IsmClient from './IsmClient';
import { selectFieldsList } from '@/lib/utils/serialization';

export const metadata = {
  title: '약식결재 및 승인 관리 | 전자정부 표준프레임워크',
  description: '시스템에서 발생하는 약식 결재 요청을 승인 또는 반려 처리합니다',
};

/**
 * 서버 페치 실패 메시지 추출.
 * 실패를 빈 배열로 삼키면 화면이 "결재 건이 0건"이라고 거짓말한다(감사 P1-1).
 * 따라서 사유를 클라이언트로 내려 StandardDataTable 의 error/onRetry 로 노출한다.
 */
function toFetchErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return '약식 결재 목록을 불러오지 못했습니다.';
}

export default async function InformalSanctionPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  let list: InformalSanctionDto[] = [];
  let fetchError: string | null = null;

  try {
    const rawData = await ismAdminService.getPendingList({ page: 0, size: 50 }, axiosConfig);
    list = rawData?.list ?? [];
  } catch (error) {
    fetchError = toFetchErrorMessage(error);
  }

  // [Server Serialization Optimization]
  // 키 목록은 생성 DTO(InformalSanctionDto)의 실제 필드명과 일치해야 한다.
  // (과거 로컬 인터페이스 기준의 존재하지 않는 키만 나열해 전 행이 {} 로 비던 결함 수정)
  const optimizedContent = selectFieldsList(list, [
    'ifmlAtrzSn', 'taskSeCd', 'taskSeNm', 'aplcntId', 'aplcntNm', 'aprvrId', 'aprvYn', 'reqYmd', 'rjctRsnCn'
  ] as (keyof InformalSanctionDto)[]);

  return (
    <Suspense fallback={<IsmLoading />}>
      <IsmClient
        initialData={{ list: optimizedContent as InformalSanctionDto[] }}
        fetchError={fetchError}
      />
    </Suspense>
  );
}

function IsmLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-pulse pb-20">
      <h1 className="sr-only">약식 결재 관리를 불러오는 중</h1>
      <div className="h-11 w-1/3 bg-muted rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[1, 2, 3].map(i => <div key={i} className="h-44 bg-muted rounded-lg" />)}
      </div>
      <div className="h-[600px] bg-muted rounded-lg" />
    </div>
  );
}
