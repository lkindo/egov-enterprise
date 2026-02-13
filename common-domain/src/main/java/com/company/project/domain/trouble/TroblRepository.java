package com.company.project.domain.trouble;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface TroblRepository extends JpaRepository<Trobl, String> {

    @Query(value = """
            SELECT TROBL_ID,
                   TROBL_NM,
                   TROBL_KND,
                   (SELECT CODE_NM 
                      FROM CCMMNDETAILCODE
                     WHERE CODE_ID = 'COM065'
                       AND USE_AT  = 'Y'
                       AND CODE = TROBL_KND) AS TROBL_KND_NM,
                   TROBL_DC,
                   TROBL_OCCRRNC_TIME,
                   TROBL_RQESTER_NM,
                   TROBL_REQUST_TIME,
                   TROBL_PROCESS_RESULT,
                   TROBL_OPETR_NM,
                   TROBL_PROCESS_TIME,
                   PROCESS_STTUS,
                   (SELECT CODE_NM 
                      FROM CCMMNDETAILCODE
                     WHERE CODE_ID = 'COM068'
                       AND USE_AT  = 'Y'
                       AND CODE = PROCESS_STTUS) AS PROCESS_STTUS_NM,                       
                   FRST_REGIST_PNTTM,
                   FRST_REGISTER_ID,
                   LAST_UPDT_PNTTM,
                   LAST_UPDUSR_ID
              FROM NTROBLINFO
             WHERE (:strTroblNm IS NULL OR :strTroblNm = '' OR TROBL_NM LIKE '%' || :strTroblNm || '%')
               AND (:strTroblKnd = '00' OR TROBL_KND = :strTroblKnd)
               AND (:strProcessSttus = '00' OR PROCESS_STTUS = :strProcessSttus)
             ORDER BY TROBL_ID
            """, nativeQuery = true)
    Page<Object[]> selectTroblList(@Param("strTroblNm") String strTroblNm,
                                   @Param("strTroblKnd") String strTroblKnd,
                                   @Param("strProcessSttus") String strProcessSttus,
                                   Pageable pageable);

    @Query(value = """
            SELECT TROBL_ID,
                   TROBL_NM,
                   TROBL_KND,
                   (SELECT CODE_NM 
                      FROM CCMMNDETAILCODE
                     WHERE CODE_ID = 'COM065'
                       AND USE_AT  = 'Y'
                       AND CODE = TROBL_KND) AS TROBL_KND_NM,
                   TROBL_DC,
                   TROBL_OCCRRNC_TIME,
                   TROBL_RQESTER_NM,
                   TROBL_REQUST_TIME,
                   TROBL_PROCESS_RESULT,
                   TROBL_OPETR_NM,
                   TROBL_PROCESS_TIME,
                   PROCESS_STTUS,
                   (SELECT CODE_NM 
                      FROM CCMMNDETAILCODE
                     WHERE CODE_ID = 'COM068'
                       AND USE_AT  = 'Y'
                       AND CODE = PROCESS_STTUS) AS PROCESS_STTUS_NM,                       
                   FRST_REGIST_PNTTM,
                   FRST_REGISTER_ID,
                   LAST_UPDT_PNTTM,
                   LAST_UPDUSR_ID
              FROM NTROBLINFO
             WHERE PROCESS_STTUS IN ('R','C')
               AND (:strTroblNm IS NULL OR :strTroblNm = '' OR TROBL_NM LIKE '%' || :strTroblNm || '%')
               AND (:strTroblKnd = '00' OR TROBL_KND = :strTroblKnd)
               AND (:strProcessSttus = '00' OR PROCESS_STTUS = :strProcessSttus)
             ORDER BY TROBL_ID
            """, nativeQuery = true)
    Page<Object[]> selectTroblProcessList(@Param("strTroblNm") String strTroblNm,
                                          @Param("strTroblKnd") String strTroblKnd,
                                          @Param("strProcessSttus") String strProcessSttus,
                                          Pageable pageable);
}
