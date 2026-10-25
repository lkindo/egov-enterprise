package nuri.business.domain.cms;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface CmsContentFileRepository extends JpaRepository<CmsContentFile, Long> {

    Optional<CmsContentFile> findByAtchFileSn(Long atchFileSn);

    List<CmsContentFile> findByContsSnAndAtchFileSnIn(Long contsSn, Collection<Long> atchFileSns);

    /** 페이지에 귀속된 첨부 전체. 미사용 첨부 정리와 페이지 삭제·파기가 쓴다(ADR-0042). */
    List<CmsContentFile> findByContsSn(Long contsSn);
}
