package nuri.business.service.board.dto;

/**
 * 게시 상태 — 서버가 Asia/Seoul 오늘(요청마다 한 번 계산한 기준일)로 판정한다(ADR-0040 결정 3, DEC-OPS-140). 화면은 날짜를 다시
 * 계산하지 않고 이 값을 그린다.
 *
 * <p>우선순위: 게시 종료일이 지났으면 {@link #ENDED}, 아니고 게시 시작일 전이면 {@link #SCHEDULED}, 그 밖은 {@link #POSTING} 이다.
 * 종료는 되돌아오지 않는 사실이라 먼저 본다 — 시작일이 종료일보다 뒤인 글(어느 날에도 보이지 않는다)을 '곧 보인다'고 하지 않는다.
 * 같은 규칙을 목록 술어({@code BoardPredicate.postingStatusIs})와 단건 판정({@code BoardPolicySupport.postingStatusOf})이 쓴다.
 */
public enum PostingStatus {
    /** 게시 시작일이 기준일보다 뒤다 — 작성자와 조회 대행 권한자에게만 보인다. */
    SCHEDULED,
    /** 게시 중이다. */
    POSTING,
    /** 게시 종료일이 기준일보다 앞이다 — 작성자와 조회 대행 권한자에게만 보인다. */
    ENDED
}
