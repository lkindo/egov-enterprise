package com.company.project.domain.system;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface BackupOpertRepository extends JpaRepository<BackupOpert, String> {

    @Query(value = """
            SELECT A.BACKUP_OPERT_ID, A.EXECUT_CYCLE, C.CODE_NM EXECUT_CYCLE_NM,
                   A.EXECUT_SCHDUL_DE, A.EXECUT_SCHDUL_HOUR, A.EXECUT_SCHDUL_MNT, A.EXECUT_SCHDUL_SECND,
                   A.BACKUP_OPERT_NM, A.BACKUP_ORGINL_DRCTRY, A.BACKUP_STRE_DRCTRY, A.CMPRS_SE, B.CODE_NM CMPRS_SE_NM,
                   A.LAST_UPDT_PNTTM, A.LAST_UPDUSR_ID,
                   A.FRST_REGISTER_ID, A.FRST_REGIST_PNTTM
              FROM NBACKUPOPERT A, CCMMNDETAILCODE B, CCMMNDETAILCODE C
             WHERE A.USE_AT = 'Y'
               AND A.EXECUT_CYCLE = C.CODE
               AND C.CODE_ID = 'COM047'
               AND A.CMPRS_SE = B.CODE
               AND B.CODE_ID = 'COM049'
               AND (:searchCondition = '0' AND A.BACKUP_OPERT_NM LIKE '%' || :searchKeyword || '%'
                    OR :searchCondition = '1' AND A.BACKUP_ORGINL_DRCTRY LIKE '%' || :searchKeyword || '%'
                    OR :searchKeyword IS NULL OR :searchKeyword = '')
             ORDER BY A.BACKUP_OPERT_ID ASC
            """, nativeQuery = true)
    Page<Object[]> selectBackupOpertList(@Param("searchCondition") String searchCondition,
            @Param("searchKeyword") String searchKeyword,
            Pageable pageable);
}
