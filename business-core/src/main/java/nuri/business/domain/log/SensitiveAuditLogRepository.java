package nuri.business.domain.log;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.querydsl.QuerydslPredicateExecutor;
import java.math.BigInteger;

/** 보존 정리 삭제({@code deleteBefore})는 V2_132 트리거에 삭제를 선언해야 하므로 사용자 정의 조각이 맡는다. */
public interface SensitiveAuditLogRepository extends JpaRepository<SensitiveAuditLog, BigInteger>,
        QuerydslPredicateExecutor<SensitiveAuditLog>, SensitiveAuditLogRepositoryCustom {
}
