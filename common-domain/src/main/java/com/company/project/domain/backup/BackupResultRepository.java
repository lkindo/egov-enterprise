package com.company.project.domain.backup;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface BackupResultRepository extends JpaRepository<BackupResult, String> {

        @Query(value = """
                        SELECT A.BACKUP_RESULT_ID, A.BACKUP_OPERT_ID, B.BACKUP_OPERT_NM, A.BACKUP_FILE, B.BACKUP_ORGINL_DRCTRY, B.BACKUP_STRE_DRCTRY,
                               A.STTUS, C.CODE_NM AS STTUS_NM, A.ERROR_INFO, A.EXECUT_BEGIN_TM, A.EXECUT_END_TM,
                               A.LAST_UPDT_PNTTM, A.LAST_UPDUSR_ID, A.FRST_REGISTER_ID, A.FRST_REGIST_PNTTM
                          FROM NBACKUPRESULT A
                          JOIN NBACKUPOPERT B ON A.BACKUP_OPERT_ID = B.BACKUP_OPERT_ID
                          JOIN CCMMNDETAILCODE C ON A.STTUS = C.CODE AND C.CODE_ID = 'COM076'
                         WHERE (:sttus = '00' OR A.STTUS = :sttus)
                           AND (:searchKeywordFrom IS NULL OR :searchKeywordFrom = '' OR SUBSTR(A.EXECUT_BEGIN_TM, 1, 8) >= :searchKeywordFrom)
                           AND (:searchKeywordTo IS NULL OR :searchKeywordTo = '' OR SUBSTR(A.EXECUT_BEGIN_TM, 1, 8) <= :searchKeywordTo)
                           AND (:searchCondition = '0' AND B.BACKUP_OPERT_NM LIKE '%' || :searchKeyword || '%'
                                OR :searchCondition = '1' AND A.BACKUP_OPERT_ID LIKE '%' || :searchKeyword || '%'
                                OR :searchKeyword IS NULL OR :searchKeyword = '')
                         ORDER BY A.BACKUP_RESULT_ID DESC
                        """, nativeQuery = true)
        Page<Object[]> selectBackupResultList(@Param("sttus") String sttus,
                        @Param("searchKeywordFrom") String searchKeywordFrom,
                        @Param("searchKeywordTo") String searchKeywordTo,
                        @Param("searchCondition") String searchCondition,
                        @Param("searchKeyword") String searchKeyword,
                        Pageable pageable);
}
