package nuri.business.domain.cms;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface CmsContentFileRepository extends JpaRepository<CmsContentFile, Long> {

    Optional<CmsContentFile> findByAtchFileSn(Long atchFileSn);

    List<CmsContentFile> findByContsSnAndAtchFileSnIn(Long contsSn, Collection<Long> atchFileSns);
}
