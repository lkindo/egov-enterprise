import SurveyRespondentsClient from './SurveyRespondentsClient';

/**
 * 종전에는 "설문 타겟팅 시스템 대기 중" 정적 스텁이었다. 백엔드는 서비스·리포지토리가 이미
 * 완성돼 있었고 컨트롤러만 없어 도달이 불가능했을 뿐이다(D-4 2단계에서 배선).
 */
export default function SurveyRespondentsPage() {
  return <SurveyRespondentsClient />;
}
