package nuri.business.domain.log;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.querydsl.QuerydslPredicateExecutor;

public interface PrivacyLogRepository
        extends JpaRepository<PrivacyLog, Long>, QuerydslPredicateExecutor<PrivacyLog>, PrivacyLogRepositoryCustom {
}
