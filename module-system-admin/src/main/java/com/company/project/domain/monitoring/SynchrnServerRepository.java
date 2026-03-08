package com.company.project.domain.monitoring;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface SynchrnServerRepository extends JpaRepository<SynchrnServer, String> {

    @Query("SELECT s FROM SynchrnServer s WHERE " +
            "(:searchCondition = '1' AND s.serverNm LIKE %:searchKeyword%) OR " +
            "(:searchCondition = '2' AND s.serverIp LIKE %:searchKeyword%) OR " +
            "(:searchCondition IS NULL OR :searchCondition = '')")
    Page<SynchrnServer> selectSynchrnServerList(@Param("searchCondition") String searchCondition,
            @Param("searchKeyword") String searchKeyword,
            Pageable pageable);

    @Query("SELECT s FROM SynchrnServer s")
    List<SynchrnServer> processSynchrnServerList();
}
