package com.company.project.domain.monitoring;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ProxySvcRepository extends JpaRepository<ProxySvc, String> {

    @Query(value = """
             SELECT A.PROXY_ID,
                    A.PROXY_NM,
                    A.PROXY_IP,
                    A.PROXY_PORT,
                    A.TRGET_SVC_NM,
                    A.SVC_DC,
                    A.SVC_IP,
                    A.SVC_PORT,
                    A.SVC_STTUS,
                    (SELECT CODE_NM
                       FROM CCMMNDETAILCODE
                      WHERE CODE_ID = 'COM072'
                        AND CODE = A.SVC_STTUS) AS SVC_STTUS_NM,
                    A.FRST_REGIST_PNTTM,
                    A.FRST_REGISTER_ID,
                    A.LAST_UPDT_PNTTM,
                    A.LAST_UPDUSR_ID
               FROM NPROXYINFO A
              WHERE (:strProxyNm IS NULL OR A.PROXY_NM LIKE '%' || :strProxyNm || '%')
              ORDER BY A.PROXY_ID DESC
            """, nativeQuery = true)
    Page<Object[]> selectProxySvcList(@Param("strProxyNm") String strProxyNm, Pageable pageable);
}
