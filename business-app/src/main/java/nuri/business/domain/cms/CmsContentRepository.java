package nuri.business.domain.cms;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface CmsContentRepository extends JpaRepository<CmsContent, Long> {

    Optional<CmsContent> findByContsPathNm(String contsPathNm);

    boolean existsByContsPathNm(String contsPathNm);

    /** 게시·게시 중지·보관처럼 게시 상태를 바꾸는 요청을 직렬화한다. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM CmsContent c WHERE c.contsSn = :contsSn")
    Optional<CmsContent> findByIdForUpdate(@Param("contsSn") Long contsSn);

    /**
     * 관리 목록. 상태는 ACTIVE(보관하지 않은 전체)·DRAFT(미게시)·PUBLISHED·ARCHIVED 중 하나다. 검색어는 제목·주소 부분 일치이고
     * 빈 문자열이면 모두다(null 매개변수를 쓰지 않는다 — PostgreSQL 이 형을 추론하지 못한다). 최근 수정 순이다.
     */
    @Query("SELECT c FROM CmsContent c WHERE "
            + "(LOWER(c.contsTtl) LIKE LOWER(CONCAT('%', :keyword, '%')) "
            + "    OR c.contsPathNm LIKE LOWER(CONCAT('%', :keyword, '%'))) "
            + "AND ((:status = 'ACTIVE' AND c.kpngYn = 'N') "
            + "  OR (:status = 'ARCHIVED' AND c.kpngYn = 'Y') "
            + "  OR (:status = 'PUBLISHED' AND c.kpngYn = 'N' AND c.contsRvsnSn IS NOT NULL) "
            + "  OR (:status = 'DRAFT' AND c.kpngYn = 'N' AND c.contsRvsnSn IS NULL)) "
            + "ORDER BY c.mdfcnDt DESC, c.contsSn DESC")
    Page<CmsContent> search(@Param("keyword") String keyword, @Param("status") String status, Pageable pageable);
}
