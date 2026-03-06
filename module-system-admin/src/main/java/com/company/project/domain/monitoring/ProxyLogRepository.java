package com.company.project.domain.monitoring;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ProxyLogRepository extends JpaRepository<ProxyLog, String> {

    @Query(value = """
             SELECT A.PROXY_ID,
                    A.LOG_ID,
                    B.PROXY_NM,
                    A.CLNT_PORT,
                    A.CLNT_IP,
                    A.CONECT_TIME,
                    A.FRST_REGIST_PNTTM,
                    A.FRST_REGISTER_ID,
                    A.LAST_UPDT_PNTTM,
                    A.LAST_UPDUSR_ID
               FROM NPROXYLOGINFO A,
                    NPROXYINFO B
              WHERE A.PROXY_ID = B.PROXY_ID
                AND (:strStartDate IS NULL OR :strEndDate IS NULL OR TO_CHAR(A.CONECT_TIME, 'YYYYmmdd') BETWEEN :strStartDate AND :strEndDate)
              ORDER BY A.LAST_UPDT_PNTTM DESC
            """, nativeQuery = true)
    Page<Object[]> selectProxyLogList(@Param("strStartDate") String strStartDate,
            @Param("strEndDate") String strEndDate,
            Pageable pageable);
}
