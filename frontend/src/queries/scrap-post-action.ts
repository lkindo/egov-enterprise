import type { PostActionContext } from '@/extensions/slots';
import { scrapService } from '@/services/business/user/ScrapService';
import { scrapKeys } from './scrap-query-options';

/**
 * 게시글 상세의 '스크랩' 부가 동작이 부르는 쓰기(스크랩 슬롯). 스크랩 기능 소유이고, 기여(src/extensions/scrap/post-actions.ts)는
 * 이 이름만 가리킨다. 잠금·토스트·완료 표시는 호스트(게시글 상세)가 한다 — 여기서는 저장과 목록 무효화만 한다.
 *
 * 쓰기 권한 판정 census(축 3)는 이 모듈을 중간 모듈로 읽어 이 함수에 SCRAP_CREATE 를 붙이고, 기여 → 레지스트리 → 게시글 상세로
 * 귀속한다. 기존 조회 옵션(scrap-query-options 의 create)과 따로 두는 것은 그 귀속 이름을 바꾸지 않기 위해서다.
 */
export async function submitPostScrap({ title, boardTitle, canonicalPath, queryClient }: PostActionContext): Promise<void> {
  // scrapNm 은 물리 컬럼 varchar(100). 게시글 제목은 더 길 수 있어 잘라 보낸다
  // — 넘기면 서버가 400 을 주는데, 스크랩은 사용자가 길이를 조절할 수 있는 입력이 아니다.
  const name = (title || '게시글 스크랩').slice(0, 100);
  await scrapService.createScrap({
    scrapNm: name,
    scrapUrl: canonicalPath,
    scrapExpln: `${boardTitle || '게시판'} - ${name}`.slice(0, 4000),
    useYn: 'Y',
  });
  await queryClient.invalidateQueries({ queryKey: scrapKeys.lists() });
}
