import OnlinePollAdminClient from './OnlinePollAdminClient';

export const metadata = {
  title: '온라인 설문 관리 | 설문 관리',
};

/**
 * 종전 이 서버 컴포넌트는 목록을 선조회한 뒤 `.catch(() => ({ list: [], total: 0 }))` 로
 * 실패를 빈 목록으로 바꿔치기했다. 조회가 실패해도 화면은 "등록된 온라인 설문이 없습니다"
 * 라고 **거짓말**을 했고, 재시도 수단도 없었다(감사 P1-1).
 *
 * 삼킴을 없애기 위해 SSR 선조회를 걷어내고 목록 조회를 클라이언트 useQuery 로 일원화했다.
 * 이제 실패는 StandardDataTable 의 error/onRetry 로 그대로 드러나고 재시도가 가능하다.
 * (페이지 상태는 클라이언트가 `?page=` 로 URL 에 반영한다 — P1-7)
 */
export default function OnlinePollAdminPage() {
  return <OnlinePollAdminClient />;
}
