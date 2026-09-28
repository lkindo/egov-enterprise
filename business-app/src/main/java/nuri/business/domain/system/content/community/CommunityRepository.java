package nuri.business.domain.system.content.community;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.querydsl.QuerydslPredicateExecutor;

public interface CommunityRepository extends JpaRepository<Community, Long>, QuerydslPredicateExecutor<Community> {
    long countByTmpltId(String tmpltId);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT c FROM Community c WHERE c.cmntySn = :id")
    java.util.Optional<Community> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") Long id);
}
