package nuri.business.domain.code;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CommonCodeGroupRepository
        extends JpaRepository<CommonCodeGroup, String>, CommonCodeGroupRepositoryCustom {
}
