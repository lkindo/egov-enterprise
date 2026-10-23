package nuri.business.domain.board;

/**
 * 사용 중인 게시판의 선택지 투영(ADR-0040 결정 11). 커뮤니티 귀속은 서비스가 호출자에 맞춰 거를 때만 쓰고 응답에는 싣지 않는다.
 * 엔티티를 적재하지 않는다 — 역방향 일대일 옵션이 행마다 추가 조회를 낼 수 있다.
 */
public record BoardOptionRow(String bbsId, String bbsTtl, Long cmntySn) {
}
