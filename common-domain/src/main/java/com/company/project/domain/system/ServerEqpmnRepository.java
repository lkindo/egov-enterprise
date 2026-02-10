package com.company.project.domain.system;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServerEqpmnRepository extends JpaRepository<ServerEqpmn, String> {

    Page<ServerEqpmn> findByServerEqpmnNmContaining(String serverEqpmnNm, Pageable pageable);

    @Query(value = """
            SELECT A.SERVER_EQPMN_ID,
                   A.SERVER_EQPMN_NM,
                   A.SERVER_EQPMN_IP,
                   A.SERVER_EQPMN_MNGR,
                   CASE
                     WHEN B.SERVER_EQPMN_ID IS NOT NULL THEN 'Y'
                     ELSE 'N'
                   END AS REG_YN
              FROM NSERVEREQPMNINFO A
              LEFT OUTER JOIN (SELECT SERVER_EQPMN_ID FROM NSERVEREQPMNRELATE WHERE SERVER_ID = :serverId) B
                ON A.SERVER_EQPMN_ID = B.SERVER_EQPMN_ID
            """, nativeQuery = true)
    Page<Object[]> selectServerEqpmnRelateList(@Param("serverId") String serverId, Pageable pageable);

    @Query(value = """
            SELECT A.*
              FROM NSERVEREQPMNINFO A
              JOIN NSERVEREQPMNRELATE B ON A.SERVER_EQPMN_ID = B.SERVER_EQPMN_ID
             WHERE B.SERVER_ID = :serverId
            """, nativeQuery = true)
    List<ServerEqpmn> selectServerEqpmnRelateDetail(@Param("serverId") String serverId);
}
