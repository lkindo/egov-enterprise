import DOMPurify from 'isomorphic-dompurify';
import { policyAdminService, SystemPolicy } from '@/services/foundation/system/PolicyAdminService';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Scale } from 'lucide-react';

/**
 * 시스템 정책 및 법률 약관 조회 페이지 (Server Component)
 * 
 * 헌법 제3조(서버 컴포넌트 우선) 및 제11조 2항(하이드레이션 안전)을 만족합니다.
 * 'use client' 및 useState/useEffect를 걷어내고, 서버 사이드에서 데이터를 직접 로드하여 렌더링합니다.
 * 날짜 API(new Date)로 인한 하이드레이션 오류가 완전히 발생하지 않습니다.
 */
export default async function PolicyViewPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  let policy: SystemPolicy | null = null;

  try {
    policy = await policyAdminService.getPolicy(type);
  } catch (error) {
    /*
     * [2026-08-28] 실패 사유를 구분한다.
     *
     * 이 화면은 본문을 /api/v1/admin/system/policies/{type} 에서 읽는데, ApiSecurityConfig 가
     * /api/v1/admin/** 를 ROLE_ADMIN·ROLE_SYSTEM 으로 제한한다. 즉 **일반 사용자에게는 영구히
     * 403** 이다. 그런데 종전 폴백은 '잠시 후 다시 시도해 주세요' 라고 안내해 일시적 장애처럼
     * 보이게 했고, 사용자는 새로고침을 반복하게 된다. 권한 문제는 기다려도 해소되지 않는다.
     *
     * 비관리자도 읽을 수 있는 공개 조회 경로를 여는 것은 신규 API 표면이라 별도 결정이다.
     */
    const status = (error as { response?: { status?: number } })?.response?.status;
    const isPermissionWall = status === 401 || status === 403;
    policy = {
      plcyTypeCd: type,
      plcyTtl: type === 'privacy' ? '개인정보 처리 방침' : '약관 및 정책',
      plcyCn: isPermissionWall
        ? '이 정책 본문은 현재 관리자만 열람할 수 있습니다. 필요하면 시스템 관리자에게 문의해 주세요.'
        : '정책 내용을 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.'
    };
  }

  return (
    <div className="container mx-auto py-20 px-6 max-w-4xl animate-in slide-in-from-bottom-5 duration-700">
      <HubHeader 
        headingLevel={1}
        title={policy?.plcyTtl || '시스템 정책'} 
        subtitle="POLICY & LEGAL"
        icon={Scale}
        className="mb-12"
      />
      
      <Card className="border-none shadow-2xl bg-card/50 backdrop-blur-sm rounded-lg overflow-hidden">
        <CardContent className="p-12">
          <div 
            className="prose prose-slate dark:prose-invert max-w-none text-lg leading-relaxed"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(policy?.plcyCn || '') }}
          />
        </CardContent>
      </Card>
      
      <div className="mt-12 text-center text-muted-foreground text-sm uppercase tracking-widest opacity-50">
        {/* ko-KR 로케일을 명시하여 서버 사이드 로케일 독립성 확보 */}
        최종 수정일: {new Date().toLocaleDateString('ko-KR')}
      </div>
    </div>
  );
}
