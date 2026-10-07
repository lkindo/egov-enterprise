package nuri.foundation.core.stats;

import java.util.List;

/**
 * 통계 화면에 자료 이용 집계를 알려 주는 포트.
 *
 * <p><b>왜 포트인가</b> — 자료 이용 기록({@code tb_dta_use_stats})은 게시글과 그 첨부를 가리키는 게시판 도메인의
 * 데이터다. 통계 서비스가 그 Repository 를 직접 주입하면 게시판이 빠진 구성에서 통계까지 함께 빠진다.
 * {@link PostStatisticsContributor} 와 같은 이유로, 세는 규칙은 데이터를 소유한 도메인에 둔다.
 *
 * <p><b>{@code List<Object[]>} 인 것은 의도다</b> — {@code StatisticsApiController} 가 이미 그 형태로 받아 매핑하는
 * 기존 JPA projection 이다. 경계만 옮기는 변경에서 wire 형태까지 바꾸지 않는다.
 *
 * <p><b>구현이 없을 때의 의미</b> — 게시판 도메인이 없으면 자료 이용 기록도 없으므로 빈 목록이 사실이다.
 */
public interface DataUsageStatisticsContributor {

    /**
     * 반개방 구간 [from, to) 내 날짜별 자료 이용 건수. 날짜 내림차순이다.
     *
     * @param from 포함하는 시작 시각 문자열({@code yyyy-MM-dd HH:mm:ss})
     * @param to   제외하는 종료 시각 문자열({@code yyyy-MM-dd HH:mm:ss})
     * @return {@code [날짜, 건수]} 행 목록
     */
    List<Object[]> countDataUsageByDate(String from, String to);
}
