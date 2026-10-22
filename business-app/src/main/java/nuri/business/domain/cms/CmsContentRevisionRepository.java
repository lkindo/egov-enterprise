package nuri.business.domain.cms;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CmsContentRevisionRepository extends JpaRepository<CmsContentRevision, Long> {

    /** 게시 이력. 최신이 앞이다. 페이지당 게시 횟수는 운영자가 직접 누른 수라 페이징하지 않는다. */
    List<CmsContentRevision> findByContsSnOrderByContsRvsnSnDesc(Long contsSn);

    Optional<CmsContentRevision> findByContsRvsnSnAndContsSn(Long contsRvsnSn, Long contsSn);

    /** 리비전 번호(v1, v2 …)는 저장하지 않고 같은 페이지에서 앞선 게시 수로 계산한다 — 리비전은 지워지지 않으므로 번호가 바뀌지 않는다. */
    long countByContsSnAndContsRvsnSnLessThanEqual(Long contsSn, Long contsRvsnSn);

    boolean existsByContsSn(Long contsSn);

    long countByContsSn(Long contsSn);
}
