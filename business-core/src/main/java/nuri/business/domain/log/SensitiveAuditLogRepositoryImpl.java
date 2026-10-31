package nuri.business.domain.log;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Objects;

@RequiredArgsConstructor
public class SensitiveAuditLogRepositoryImpl implements SensitiveAuditLogRepositoryCustom {

    private final EntityManager entityManager;
    private final nuri.foundation.core.persistence.VendorSqlDialect vendorSql;

    /** 삭제 선언과 삭제가 한 트랜잭션이어야 한다 — 선언은 트랜잭션 지역이다(AuditLedgerRetention). */
    @Override
    @Transactional
    public int deleteBefore(LocalDateTime cutoff) {
        AuditLedgerRetention.permitDeletionInCurrentTransaction(entityManager, vendorSql);
        return entityManager.createQuery("delete from SensitiveAuditLog a where a.adtDt < :cutoff")
                .setParameter("cutoff", Objects.requireNonNull(cutoff))
                .executeUpdate();
    }
}
