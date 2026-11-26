/**
 * 보낸 메일 이력 목록의 조회 키. 이력 화면의 삭제·다시 보내기와 메일 발송 화면(보낸 뒤)이 `all` 을 무효화한다.
 *
 * 기능을 뺀 생성물에서 연쇄 제거에 걸리지 않게 어떤 모듈도 import 하지 않는다.
 */
export const mailHistoryKeys = {
  all: ['mail-history'] as const,
  list: (searchField: string, keyword: string, resultFilter: string, page: number) =>
    [...mailHistoryKeys.all, searchField, keyword, resultFilter, page] as const,
};
