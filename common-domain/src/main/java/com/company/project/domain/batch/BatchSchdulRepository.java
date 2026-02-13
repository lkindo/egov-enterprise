package com.company.project.domain.batch;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface BatchSchdulRepository extends JpaRepository<BatchSchdul, String> {

       @Query(value = """
                     SELECT A.BATCH_SCHDUL_ID, A.BATCH_OPERT_ID, A.EXECUT_CYCLE, C.CODE_NM AS EXECUT_CYCLE_NM,
                            A.EXECUT_SCHDUL_DE, A.EXECUT_SCHDUL_HOUR, A.EXECUT_SCHDUL_MNT, A.EXECUT_SCHDUL_SECND,
                            B.BATCH_OPERT_NM, B.BATCH_PROGRM, B.PARAMTR,
                            A.LAST_UPDT_PNTTM, A.LAST_UPDUSR_ID, A.FRST_REGISTER_ID, A.FRST_REGIST_PNTTM
                       FROM NBATCHSCHDUL A
                       JOIN NBATCHOPERT B ON A.BATCH_OPERT_ID = B.BATCH_OPERT_ID
                       JOIN CCMMNDETAILCODE C ON A.EXECUT_CYCLE = C.CODE AND C.CODE_ID = 'COM047'
                      WHERE (:searchCondition = '0' AND B.BATCH_OPERT_NM LIKE '%' || :searchKeyword || '%'
                             OR :searchCondition = '1' AND B.BATCH_PROGRM LIKE '%' || :searchKeyword || '%'
                             OR :searchKeyword IS NULL OR :searchKeyword = '')
                      ORDER BY A.BATCH_SCHDUL_ID ASC
                     """, nativeQuery = true)
       Page<Object[]> selectBatchSchdulList(@Param("searchCondition") String searchCondition,
                     @Param("searchKeyword") String searchKeyword,
                     Pageable pageable);

       default Page<BatchSchdul> searchBatchSchduls(String condition, String keyword, Pageable pageable) {
              return selectBatchSchdulList(condition, keyword, pageable)
                            .map(row -> findById((String) row[0]).orElse(null));
       }

       @Query("select d from BatchSchdulDfk d where d.id.batchSchdulId in :ids")
       java.util.List<BatchSchdulDfk> findAllDfksByBatchSchdulIdIn(@Param("ids") java.util.Collection<String> ids);
}
