package com.company.project.domain.survey;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public interface QustnrRespondInfoRepository extends JpaRepository<QustnrRespondInfo, String> {

    // Í∞ùÍ????µÍ≥Ñ (Statistics 1)
    @Query(value = """
            SELECT
                A.QUSTNR_TMPLAT_ID AS qestnrTmplatId,
                A.QESTNR_ID AS qestnrId,
                A.QUSTNR_QESITM_ID AS qestnrQesitmId,
                A.QUSTNR_IEM_ID AS qustnrIemId,
                (
                    SELECT IEM_CN FROM NQUSTNRIEM
                    WHERE QUSTNR_IEM_ID = A.QUSTNR_IEM_ID
                ) AS iemCn,
                COUNT(A.QUSTNR_IEM_ID) AS qustnrIemIdCnt,
                ROUND((100.0 / (SELECT COUNT(*) FROM NQUSTNRRSPNSRESULT WHERE QUSTNR_QESITM_ID = A.QUSTNR_QESITM_ID) ) * COUNT(A.QUSTNR_IEM_ID)) AS qustnrPercent
            FROM NQUSTNRRSPNSRESULT A
            WHERE A.QESTNR_ID = :qestnrId
            AND A.QUSTNR_TMPLAT_ID = :qestnrTmplatId
            AND (A.QUSTNR_IEM_ID IS NOT NULL AND A.QUSTNR_IEM_ID != '')
            GROUP BY A.QUSTNR_TMPLAT_ID, A.QESTNR_ID, A.QUSTNR_QESITM_ID, A.QUSTNR_IEM_ID
            """, nativeQuery = true)
    List<Map<String, Object>> selectQustnrRespondInfoManageStatistics1(@Param("qestnrId") String qestnrId,
            @Param("qestnrTmplatId") String qestnrTmplatId);

    // Ï£ºÍ????µÍ≥Ñ (Statistics 2)
    @Query(value = """
            SELECT
                A.QUSTNR_TMPLAT_ID AS qestnrTmplatId,
                A.QESTNR_ID AS qestnrId,
                A.QUSTNR_QESITM_ID AS qestnrQesitmId,
                A.QUSTNR_IEM_ID AS qustnrIemId,
                A.ETC_ANSWER_CN AS etcAnswerCn,
                A.RESPOND_ANSWER_CN AS respondAnswerCn,
                A.RESPOND_NM AS respondNm
            FROM NQUSTNRRSPNSRESULT A
            WHERE A.QESTNR_ID = :qestnrId
            AND A.QUSTNR_TMPLAT_ID = :qestnrTmplatId
            AND (A.QUSTNR_IEM_ID IS NULL OR A.QUSTNR_IEM_ID = '')
            """, nativeQuery = true)
    List<Map<String, Object>> selectQustnrRespondInfoManageStatistics2(@Param("qestnrId") String qestnrId,
            @Param("qestnrTmplatId") String qestnrTmplatId);
}
