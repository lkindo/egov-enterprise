package nuri.business.domain.file;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * ???뵬 筌띾뜆???JPA Repository
 */
@Repository
public interface FileMasterRepository extends JpaRepository<FileMaster, String> {
}
