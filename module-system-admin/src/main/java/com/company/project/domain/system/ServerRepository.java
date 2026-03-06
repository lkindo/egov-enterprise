package com.company.project.domain.system;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ServerRepository extends JpaRepository<Server, String> {

  @Query(value = """
      SELECT A.SERVER_ID,
             A.SERVER_NM,
             A.SERVER_KND,
            (SELECT CD.CODE_NM
               FROM CCMMNDETAILCODE CD
              WHERE CD.CODE_ID = 'COM064'
                AND CD.USE_AT  = 'Y'
                AND A.SERVER_KND = CD.CODE) AS SERVER_KND_NM,
             A.RGSDE,
             A.FRST_REGIST_PNTTM,
             A.FRST_REGISTER_ID,
             A.LAST_UPDT_PNTTM,
             A.LAST_UPDUSR_ID
        FROM NSERVERINFO A
       WHERE (:serverNm IS NULL OR :serverNm = '' OR A.SERVER_NM LIKE '%' || :serverNm || '%')
       ORDER BY A.SERVER_ID
      """, nativeQuery = true)
  Page<Object[]> selectServerList(@Param("serverNm") String serverNm, Pageable pageable);

  Page<Server> findByServerNmContaining(String serverNm, Pageable pageable);
}
