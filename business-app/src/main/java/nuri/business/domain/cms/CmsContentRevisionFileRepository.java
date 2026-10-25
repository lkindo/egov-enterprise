package nuri.business.domain.cms;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CmsContentRevisionFileRepository extends JpaRepository<CmsContentRevisionFile, CmsContentRevisionFileId> {

    /** 어느 게시본이든 이 귀속 첨부를 쓰는가 — 쓰면 초안에서 빠져도 귀속을 풀지 않는다(ADR-0042). */
    boolean existsByIdContsFileSn(Long contsFileSn);
}
