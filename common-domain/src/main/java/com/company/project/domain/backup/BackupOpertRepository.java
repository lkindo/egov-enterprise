package com.company.project.domain.backup;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface BackupOpertRepository extends JpaRepository<BackupOpert, String> {

     @Query(value = """
               SELECT A.BACKUP_OPERT_ID, A.EXECUT_CYCLE, C.CODE_NM AS EXECUT_CYCLE_NM,
                      A.EXECUT_SCHDUL_DE, A.EXECUT_SCHDUL_HOUR, A.EXECUT_SCHDUL_MNT, A.EXECUT_SCHDUL_SECND,
                      A.BACKUP_OPERT_NM, A.BACKUP_ORGINL_DRCTRY, A.BACKUP_STRE_DRCTRY, A.CMPRS_SE, B.CODE_NM AS CMPRS_SE_NM,
                      A.LAST_UPDT_PNTTM, A.LAST_UPDUSR_ID, A.FRST_REGISTER_ID, A.FRST_REGIST_PNTTM
                 FROM NBACKUPOPERT A
                 JOIN CCMMNDETAILCODE B ON A.CMPRS_SE = B.CODE AND B.CODE_ID = 'COM049'
                 JOIN CCMMNDETAILCODE C ON A.EXECUT_CYCLE = C.CODE AND C.CODE_ID = 'COM047'
                WHERE A.USE_AT = 'Y'
                  AND (:searchCondition = '0' AND A.BACKUP_OPERT_NM LIKE '%' || :searchKeyword || '%'
                       OR :searchCondition = '1' AND A.BACKUP_ORGINL_DRCTRY LIKE '%' || :searchKeyword || '%'
                       OR :searchKeyword IS NULL OR :searchKeyword = '')
                ORDER BY A.BACKUP_OPERT_ID ASC
               """, nativeQuery = true)
     Page<Object[]> selectBackupOpertList(@Param("searchCondition") String searchCondition,
               @Param("searchKeyword") String searchKeyword,
               Pageable pageable);

     default Page<BackupOpert> searchBackupOperts(String searchCondition, String searchKeyword, Pageable pageable) {
          return selectBackupOpertList(searchCondition, searchKeyword, pageable)
                    .map(row -> findById((String) row[0]).orElse(null));
     }
}
