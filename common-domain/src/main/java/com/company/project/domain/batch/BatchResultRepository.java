package com.company.project.domain.batch;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface BatchResultRepository extends JpaRepository<BatchResult, String> {

        @Query(value = """
                        SELECT A.BATCH_RESULT_ID, A.BATCH_SCHDUL_ID, A.BATCH_OPERT_ID, B.BATCH_OPERT_NM, B.BATCH_PROGRM, A.PARAMTR,
                               A.STTUS, C.CODE_NM AS STTUS_NM, A.ERROR_INFO, A.EXECUT_BEGIN_TM, A.EXECUT_END_TM,
                               A.LAST_UPDT_PNTTM, A.LAST_UPDUSR_ID, A.FRST_REGISTER_ID, A.FRST_REGIST_PNTTM
                          FROM NBATCHRESULT A
                          JOIN NBATCHOPERT B ON A.BATCH_OPERT_ID = B.BATCH_OPERT_ID
                          JOIN CCMMNDETAILCODE C ON A.STTUS = C.CODE AND C.CODE_ID = 'COM076'
                         WHERE (:sttus = '00' OR A.STTUS = :sttus)
                           AND (:searchKeywordFrom IS NULL OR :searchKeywordFrom = '' OR SUBSTR(A.EXECUT_BEGIN_TM, 1, 8) >= :searchKeywordFrom)
                           AND (:searchKeywordTo IS NULL OR :searchKeywordTo = '' OR SUBSTR(A.EXECUT_BEGIN_TM, 1, 8) <= :searchKeywordTo)
                           AND (:searchCondition = '0' AND B.BATCH_OPERT_NM LIKE '%' || :searchKeyword || '%'
                                OR :searchCondition = '1' AND A.BATCH_SCHDUL_ID LIKE '%' || :searchKeyword || '%'
                                OR :searchKeyword IS NULL OR :searchKeyword = '')
                         ORDER BY A.BATCH_RESULT_ID DESC
                        """, nativeQuery = true)
        Page<Object[]> selectBatchResultList(@Param("sttus") String sttus,
                        @Param("searchKeywordFrom") String searchKeywordFrom,
                        @Param("searchKeywordTo") String searchKeywordTo,
                        @Param("searchCondition") String searchCondition,
                        @Param("searchKeyword") String searchKeyword,
                        Pageable pageable);
}
