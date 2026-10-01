package nuri.business.domain.log;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.querydsl.QuerydslPredicateExecutor;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigInteger;
import java.time.LocalDateTime;

public interface SensitiveAuditLogRepository extends JpaRepository<SensitiveAuditLog, BigInteger>,
        QuerydslPredicateExecutor<SensitiveAuditLog> {
    @Modifying
    @Transactional
    @Query("delete from SensitiveAuditLog a where a.adtDt < :cutoff")
    int deleteBefore(@Param("cutoff") LocalDateTime cutoff);
}
