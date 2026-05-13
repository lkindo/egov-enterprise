package nuri.foundation.domain.log;

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
            SELECT OCCRRNC_DE as statsDate,
                   SUM(CRT_CNT) as creatCo,
                   SUM(INQ_CNT) as inqireCo
            FROM TB_USER_LOG
            WHERE OCCRRNC_DE BETWEEN :fromDate AND :toDate
            GROUP BY OCCRRNC_DE
            ORDER BY OCCRRNC_DE ASC
            """, nativeQuery = true)
    List<Object[]> countByDate(@Param("fromDate") String fromDate, @Param("toDate") String toDate);
}
