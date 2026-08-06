import { redirect } from 'next/navigation';

/**
 * `/admin/survey/items` 는 "준비 중" 정적 스텁이었다. 실기능은 2026-08-06 부터
 * 허브의 `?tab=questions` 탭에 있다(항목(문항 하위)).
 *
 * 라우트를 지우지 않고 보내는 이유는 형제 `/admin/survey/page.tsx` 와 같다 —
 * 문자열 URL 참조는 정적 분석으로 잡히지 않아 물리 삭제에 오삭제 전례가 있다.
 * 리다이렉트는 기존 북마크를 404 로 만들지 않으면서 <b>기능이 있는데 "준비 중" 을 보여주는
 * 거짓 신호</b>만 끝낸다.
 */
export default function SurveyStubRedirectPage() {
  redirect('/admin/survey/hub?tab=questions');
}
