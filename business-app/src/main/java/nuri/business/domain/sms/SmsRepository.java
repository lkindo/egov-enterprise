package nuri.business.domain.sms;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * SMS Repository
 */
public interface SmsRepository extends JpaRepository<Sms, Long>, SmsRepositoryCustom {

    Page<Sms> findBySndngCnContaining(String keyword, Pageable pageable);


}
