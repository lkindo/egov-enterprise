package com.company.project.domain.monitoring;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServerResrceMntrngLogRepository extends JpaRepository<ServerResrceMntrngLog, String> {

    @Query(value = """
             SELECT A.SERVER_ID,
                    A.SERVER_EQPMN_ID,
                    A.LOG_ID,
                    C.SERVER_EQPMN_NM AS SERVER_NM,
                    C.SERVER_EQPMN_IP,
                    A.CPU_USE_RT,
                    A.MORY_USE_RT,
                    A.SVC_STTUS,
                    (SELECT CODE_NM
                       FROM CCMMNDETAILCODE
                      WHERE CODE_ID = 'COM072'
                        AND CODE = A.SVC_STTUS) AS SVC_STTUS_NM,
                    A.LOG_INFO,
                    C.MNGR_EMAIL_ADRES,
                    A.CREAT_DT,
                    A.FRST_REGIST_PNTTM,
                    A.FRST_REGISTER_ID,
                    A.LAST_UPDT_PNTTM,
                    A.LAST_UPDUSR_ID
               FROM NSERVERRESRCELOGINFO A,
                    NSERVERINFO B,
                    NSERVEREQPMNINFO C
              WHERE A.SERVER_ID       = B.SERVER_ID
                AND A.SERVER_EQPMN_ID = C.SERVER_EQPMN_ID
                AND (:strServerNm IS NULL OR C.SERVER_EQPMN_NM LIKE '%' || :strServerNm || '%')
                AND (:strStartDt IS NULL OR :strEndDt IS NULL OR TO_CHAR(A.CREAT_DT, 'YYYYmmdd') BETWEEN :strStartDt AND :strEndDt)
              ORDER BY A.LOG_ID DESC
            """, nativeQuery = true)
    Page<Object[]> selectServerResrceMntrngList(@Param("strServerNm") String strServerNm,
            @Param("strStartDt") String strStartDt,
            @Param("strEndDt") String strEndDt,
            Pageable pageable);

    @Query(value = """
             SELECT A.SERVER_ID,
                    A.SERVER_EQPMN_ID,
                    B.SERVER_EQPMN_NM,
                    B.SERVER_EQPMN_IP,
                    B.MNGR_EMAIL_ADRES
               FROM NSERVEREQPMNRELATE A,
                    NSERVEREQPMNINFO B
              WHERE A.SERVER_EQPMN_ID = B.SERVER_EQPMN_ID
                AND (:strServerNm IS NULL OR B.SERVER_EQPMN_NM LIKE '%' || :strServerNm || '%')
            """, nativeQuery = true)
    List<Object[]> selectMntrngServerList(@Param("strServerNm") String strServerNm);
}
