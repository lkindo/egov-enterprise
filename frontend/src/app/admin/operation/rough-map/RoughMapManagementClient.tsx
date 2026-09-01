import { WorkListPage } from '@/app/components/patterns/work-list-page';

/**
 * canonical route는 유지하되, 대응 백엔드가 생기기 전에는 네트워크 요청이나 가짜 데이터를
 * 만들지 않는다. API가 추가되면 OpenAPI 계약을 먼저 생성한 뒤 이 화면을 조회형 목록으로
 * 다시 연결한다.
 */
export default function RoughMapManagementClient() {
  return (
    <WorkListPage
      title="약도 및 거점 관리"
      description="약도 및 거점 기능의 지원 상태를 확인합니다."
      breadcrumbItems={[{ label: '운영지원' }, { label: '공간관리' }]}
    >
      <section
        role="status"
        className="space-y-2 rounded-md border border-warning/30 bg-warning/10 p-5 text-[length:var(--font-size-body)]"
      >
        <h2 className="font-bold text-foreground">약도 관리 백엔드가 아직 제공되지 않습니다.</h2>
        <p className="text-muted-foreground">
          대응 API가 구현되기 전까지 조회·등록·수정·삭제 기능을 사용할 수 없습니다.
        </p>
      </section>
    </WorkListPage>
  );
}
