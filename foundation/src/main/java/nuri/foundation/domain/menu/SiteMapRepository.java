package nuri.foundation.domain.menu;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SiteMapRepository extends JpaRepository<SiteMap, String> {
}
