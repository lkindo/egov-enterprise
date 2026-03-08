package com.company.project.domain.system.monitoring;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;

@Repository
public interface ServerResrceLogRepository extends JpaRepository<ServerResrceLog, String> {

    @Query(value = """
            SELECT A.SERVER_ID,
                   A.SERVER_EQPMN_ID,
                   A.LOG_ID,
                   C.SERVER_EQPMN_NM AS SERVER_NM,
                   C.SERVER_EQPMN_IP,
                   A.CPU_USE_RT,
                   A.MORY_USE_RT,
                   A.SVC_STTUS,
                   (SELECT CD.CODE_NM
                      FROM CCMMNDETAILCODE CD
                     WHERE CD.CODE_ID = 'COM072'
                       AND CD.CODE = A.SVC_STTUS) AS SVC_STTUS_NM,
                   A.LOG_INFO,
                   C.MNGR_EMAIL_ADRES,
                   A.CREAT_DT,
                   A.FRST_REGIST_PNTTM,
                   A.FRST_REGISTER_ID,
                   A.LAST_UPDT_PNTTM,
                   A.LAST_UPDUSR_ID
              FROM NSERVERRESRCELOGINFO A
              JOIN NSERVERINFO B ON A.SERVER_ID = B.SERVER_ID
              JOIN NSERVEREQPMNINFO C ON A.SERVER_EQPMN_ID = C.SERVER_EQPMN_ID
             WHERE (:strServerNm IS NULL OR :strServerNm = '' OR C.SERVER_EQPMN_NM LIKE '%' || :strServerNm || '%')
               AND (:startDt IS NULL OR A.CREAT_DT >= :startDt)
               AND (:endDt IS NULL OR A.CREAT_DT <= :endDt)
             ORDER BY A.LOG_ID DESC
            """, nativeQuery = true)
    Page<Object[]> selectServerResrceMntrngList(@Param("strServerNm") String strServerNm,
                                                @Param("startDt") LocalDateTime startDt,
                                                @Param("endDt") LocalDateTime endDt,
                                                Pageable pageable);
}
