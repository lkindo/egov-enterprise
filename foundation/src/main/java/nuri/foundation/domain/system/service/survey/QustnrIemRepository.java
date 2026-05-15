package nuri.foundation.domain.system.service.survey;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface QustnrIemRepository extends JpaRepository<QustnrIem, String> {
    List<QustnrIem> findBySrvyQitemIdOrderBySrvyItemSnAsc(String srvyQitemId);
}
