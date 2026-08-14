package nuri.business.repository.operation;

import nuri.business.domain.operation.EventInfo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface EventInfoRepository extends JpaRepository<EventInfo, Long> {
    
    @Query("SELECT e FROM EventInfo e WHERE " +
           "(:searchWrd IS NULL OR e.evntCn LIKE %:searchWrd% OR e.evntNm LIKE %:searchWrd%)")
    Page<EventInfo> findBySearchWrd(@Param("searchWrd") String searchWrd, Pageable pageable);
}
