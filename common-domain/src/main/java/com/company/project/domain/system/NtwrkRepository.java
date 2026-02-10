package com.company.project.domain.system;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface NtwrkRepository extends JpaRepository<Ntwrk, String> {

    @Query(value = """
            SELECT NTWRK_ID,
                   NTWRK_IP,
                   GTWY,
                   SUBNET,
                   DOMN_NM_SERVER,
                   (SELECT CD.CODE_NM
                      FROM CCMMNDETAILCODE CD
                     WHERE CD.CODE_ID = 'COM067'
                       AND CD.USE_AT = 'Y'
                       AND MANAGE_IEM = CD.CODE) AS MANAGE_IEM,
                   USER_NM,
                   USE_AT,
                   RGSDE,
                   FRST_REGIST_PNTTM,
                   FRST_REGISTER_ID,
                   LAST_UPDT_PNTTM,
                   LAST_UPDUSR_ID
              FROM NNTWRKINFO
             WHERE (:manageIem = '00' OR MANAGE_IEM = :manageIem)
               AND (:userNm IS NULL OR :userNm = '' OR USER_NM LIKE '%' || :userNm || '%')
             ORDER BY NTWRK_ID
            """, nativeQuery = true)
    Page<Object[]> selectNtwrkList(@Param("manageIem") String manageIem,
            @Param("userNm") String userNm,
            Pageable pageable);
}
