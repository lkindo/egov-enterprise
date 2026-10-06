package nuri.business.domain.sms;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * SMS Repository
 */
public interface SmsRepository extends JpaRepository<Sms, Long>, SmsRepositoryCustom {
}
