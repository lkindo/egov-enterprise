package nuri.business.domain.isg;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InternetSvcGuidanceRepository extends JpaRepository<InternetSvcGuidance, String> {
    Page<InternetSvcGuidance> findByItntSvcNmContaining(String itntSvcNm, Pageable pageable);
}
