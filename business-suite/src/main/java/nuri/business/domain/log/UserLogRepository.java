package nuri.business.domain.log;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface UserLogRepository extends JpaRepository<UserLog, UserLogId>, UserLogRepositoryCustom {

    /**
     * 날짜별 사용자 활동 통계
     */
    @org.springframework.data.jpa.repository.Query(value = """
            SELECT ocrn_ymd as statsDate,
                   SUM(crt_cnt) as creatCo,
                   SUM(inq_cnt) as inqireCo
            FROM tb_user_log
            WHERE ocrn_ymd BETWEEN :fromDate AND :toDate
            GROUP BY ocrn_ymd
            ORDER BY ocrn_ymd ASC
            """, nativeQuery = true)
    List<Object[]> countByDate(@Param("fromDate") String fromDate, @Param("toDate") String toDate);
}
