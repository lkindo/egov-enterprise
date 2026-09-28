package nuri.business.domain.operation;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface EventInfoRepository extends JpaRepository<EventInfo, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from EventInfo e where e.evntSn = :evntSn")
    Optional<EventInfo> findByIdForUpdate(@Param("evntSn") Long evntSn);
    
    @Query("SELECT e FROM EventInfo e WHERE " +
           "(:searchWrd IS NULL OR e.evntCn LIKE %:searchWrd% OR e.evntNm LIKE %:searchWrd%)")
    Page<EventInfo> findBySearchWrd(@Param("searchWrd") String searchWrd, Pageable pageable);
}
