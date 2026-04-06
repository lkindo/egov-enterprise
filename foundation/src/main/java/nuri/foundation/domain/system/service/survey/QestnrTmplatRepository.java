package nuri.foundation.domain.system.service.survey;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * ??뿅??쀫탣??Repository
 */
public interface QestnrTmplatRepository extends JpaRepository<QestnrTmplat, String> {
    Page<QestnrTmplat> findByQestnrTmplatTyContaining(String qestnrTmplatTy, Pageable pageable);
}
