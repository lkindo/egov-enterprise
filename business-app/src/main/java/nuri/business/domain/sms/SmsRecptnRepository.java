package nuri.business.domain.sms;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SmsRecptnRepository extends JpaRepository<SmsRecptn, SmsRecptnId> {
    List<SmsRecptn> findByIdSmsTrsmSn(Long smsTrsmSn);
}
