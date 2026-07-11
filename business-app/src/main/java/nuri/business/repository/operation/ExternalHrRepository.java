package nuri.business.repository.operation;

import nuri.business.domain.operation.ExternalHr;
import nuri.business.domain.operation.ExternalHrId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExternalHrRepository extends JpaRepository<ExternalHr, ExternalHrId> {
    List<ExternalHr> findByEvntId(String evntId);
    List<ExternalHr> findByOtsdHrNmContaining(String name);
}
