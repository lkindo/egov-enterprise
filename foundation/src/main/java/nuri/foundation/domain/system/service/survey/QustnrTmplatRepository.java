package nuri.foundation.domain.system.service.survey;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface QustnrTmplatRepository extends JpaRepository<QustnrTmplat, String> {
    Optional<QustnrTmplat> findByQustnrTmplatId(String qustnrTmplatId);
    Page<QustnrTmplat> findByQustnrTmplatTyContaining(String keyword, Pageable pageable);
}
