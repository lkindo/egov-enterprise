package nuri.business.domain.log;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface UserLogRepository extends JpaRepository<UserLog, UserLogId>, UserLogRepositoryCustom {

    /**
     * 사용자 삭제 시 해당 사용자의 사용통계 로그를 일괄 정리한다.
     * <p>키 규약상 {@code tb_user_log.dmnd_user_id} 는 esntl_id(FK, ①계층)이며 개인 단위
     * 사용통계이므로 파기 대상이다. @IdClass 복합키 엔티티라 파생 deleteBy(로드-후-건별삭제)가 아닌
     * 벌크 JPQL 로 명시해 결정적으로 삭제한다(대량 시에도 안전). — fk_tb_user_log_tb_user_info 잠복 결함 해소.
     */
    @Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM UserLog u WHERE u.dmndUserId IN :esntlIds")
    int deleteByDmndUserIdIn(@Param("esntlIds") List<String> esntlIds);

    /**
     * 날짜별 사용자 활동 통계 — {@code [일자(yyyyMMdd), 조회, 등록, 수정, 삭제]}, 일자 오름차순.
     *
     * <p>[2026-10-20] 종전에는 등록·조회 두 합만 가져왔고 통계 화면은 그중 등록 하나만 실었다. 요청 구분 네 개를 같은
     * 질의에서 함께 낸다. 열 순서가 계약이다 — {@code ReportStatsService#getUserStatsByDate} 가 이 순서로 읽는다.
     * 출력({@code otpt_cnt})은 HTTP 메서드로 판정되지 않아 늘 0 이고({@code ProcessTypeCode}), 오류({@code err_cnt})는 네 구분과
     * 겹치는 수라 싣지 않는다.
     */
    @org.springframework.data.jpa.repository.Query(value = """
            SELECT ocrn_ymd as statsDate,
                   SUM(inq_cnt) as inqCnt,
                   SUM(crt_cnt) as crtCnt,
                   SUM(mdfcn_cnt) as mdfcnCnt,
                   SUM(del_cnt) as delCnt
            FROM tb_user_log
            WHERE ocrn_ymd BETWEEN :fromDate AND :toDate
            GROUP BY ocrn_ymd
            ORDER BY ocrn_ymd ASC
            """, nativeQuery = true)
    List<Object[]> countByDate(@Param("fromDate") String fromDate, @Param("toDate") String toDate);
}
