package nuri.foundation.core.stats;

import java.util.List;

/**
 * 통계 화면에 게시글 집계를 알려 주는 포트.
 *
 * <p><b>왜 포트인가</b> — 종전에는 {@code ReportStatsService} 가 {@code BoardRepository} 를 인라인 FQN 으로
 * 주입해 stats→board 교차 도메인 결합을 만들었다(GAP-ARCH-001 의 잔여 4건 중 하나). 통계는 여러 도메인의
 * 숫자를 모으는 소비자이므로, 각 숫자를 세는 규칙은 그 숫자를 소유한 도메인에 둔다.
 *
 * <p><b>{@code List<Object[]>} 인 것은 의도다</b> — 이 값은 {@code StatisticsApiController} 가 이미 그 형태로
 * 받아 매핑하는 기존 JPA projection 이다. 경계만 옮기는 변경에서 wire 형태까지 바꾸면 컨트롤러·응답 계약이
 * 함께 흔들린다. 새 표현이 필요해지면 그때 별도 변경으로 바꾼다.
 *
 * <p><b>구현이 없을 때의 의미</b> — 게시판 도메인이 없으면 게시글도 없으므로 총계 0·빈 목록이 사실이다.
 */
public interface PostStatisticsContributor {

    /** 논리 삭제를 포함한 전체 게시글 수({@code tb_bbs_item} 행 수). */
    long countPosts();

    /**
     * 반개방 구간 [from, to) 내 날짜별 게시글 수.
     *
     * @param from 포함하는 시작 시각 문자열({@code yyyy-MM-dd HH:mm:ss})
     * @param to   제외하는 종료 시각 문자열({@code yyyy-MM-dd HH:mm:ss})
     * @return {@code [날짜, 건수]} 행 목록. 논리 삭제된 글은 제외한다
     */
    List<Object[]> countPostsByDate(String from, String to);
}
