import { Bookmark } from 'lucide-react';
import { defineContributions } from '@/extensions/slots';
import { submitPostScrap } from '@/queries/scrap-post-action';

/**
 * 스크랩 → 게시글 상세 부가 동작 기여(스크랩 슬롯). 게시글 상세가 추천과 삭제 사이에 이 버튼을 그린다.
 * 스크랩 기능이 빠진 구성에서는 이 파일이 기능과 함께 직접 지워지고 레지스트리가 빈 배열로 다시 만들어진다 — 게시판은 그대로다.
 *
 * 저장은 서버에 (사용자, URL) 유일성 제약이 없어 누를 때마다 보관함 행이 하나씩 는다. 그래서 이번 방문에서 한 번만 누르게 잠근다
 * (oncePerVisit). 새로고침하면 풀리므로 중복 제거를 서버 계약처럼 말하지 않는다.
 *
 * 노출은 스크랩 등록 권한(SCRAP_CREATE)이 있는 사람에게만 한다(스크랩 슬롯 S3). 저장 API 가 같은 권한을 요구해, 권한 없는 사용자에게
 * 버튼을 보이면 누를 때마다 403 이었다. 권한 상태를 모르는 동안은 보이지 않는다. 노출일 뿐 인가가 아니다 — 서버 권한은 그대로다(H3).
 */
export default defineContributions('post-actions', [
  {
    id: 'scrap',
    order: 10,
    label: '스크랩',
    doneLabel: '스크랩됨',
    name: '게시글 스크랩',
    busyName: '게시글 스크랩 보관 중',
    doneName: '게시글 스크랩됨',
    icon: Bookmark,
    successMessage: '게시글을 스크랩 보관함에 저장했습니다.',
    failureMessage: '스크랩 저장 중 오류가 발생했습니다.',
    oncePerVisit: true,
    submit: submitPostScrap,
    visibleWhen: { permissions: ['SCRAP_CREATE'] },
  },
]);
