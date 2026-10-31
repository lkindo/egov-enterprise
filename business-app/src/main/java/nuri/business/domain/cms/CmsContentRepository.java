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
     * 관리 목록. 상태 조건은 다음 중 하나다(ADR-0042).
     * <ul>
     *   <li>ACTIVE — 보관하지 않은 전체</li>
     *   <li>PENDING — 게시를 기다리는 페이지: 한 번도 게시하지 않은 초안, 또는 게시 중인데 저장한 초안이 게시본과 다른 페이지</li>
     *   <li>DRAFT — 한 번도 게시하지 않은 초안</li>
     *   <li>PUBLISHED — 게시 중</li>
     *   <li>UNPUBLISHED — 게시한 적이 있지만 지금은 게시를 중지한 페이지</li>
     *   <li>ARCHIVED — 보관</li>
     * </ul>
     * 검색어는 제목·주소 부분 일치이고 빈 문자열이면 모두다(null 매개변수를 쓰지 않는다 — PostgreSQL 이 형을 추론하지 못한다). 검색어의
     * % 와 _ 는 글자 그대로 찾는다(호출자가 \ 로 막아 넘긴다). 최근 수정 순이다.
     *
     * <p>"게시본과 다름" 은 제목·요약·문서를 현재 게시본과 비교한다. 요약은 NULL 과 빈 문자열을 같게 본다 — {@code COALESCE(x, '')} 는
     * {@code ''} 가 NULL 인 Oracle 에서 비교가 UNKNOWN 이 되어 요약만 바뀐 페이지가 빠지므로 길이로 판정한다. 문서는 jsonb 라 키 순서·공백과 상관없이 같은 값이면 같다 — 서버
     * 검증기의 같은 문서 판정({@code CmsDocumentValidator#sameDocument})과 같은 의미다.
     */
    @Query("SELECT c FROM CmsContent c WHERE "
            + "(LOWER(c.contsTtl) LIKE LOWER(CONCAT('%', :keyword, '%')) ESCAPE '\\' "
            + "    OR c.contsPathNm LIKE LOWER(CONCAT('%', :keyword, '%')) ESCAPE '\\') "
            + "AND ((:status = 'ACTIVE' AND c.kpngYn = 'N') "
            + "  OR (:status = 'ARCHIVED' AND c.kpngYn = 'Y') "
            + "  OR (:status = 'PUBLISHED' AND c.kpngYn = 'N' AND c.contsRvsnSn IS NOT NULL) "
            + "  OR (:status = 'DRAFT' AND c.kpngYn = 'N' AND c.contsRvsnSn IS NULL "
            + "      AND NOT EXISTS (SELECT 1 FROM CmsContentRevision r WHERE r.contsSn = c.contsSn)) "
            + "  OR (:status = 'UNPUBLISHED' AND c.kpngYn = 'N' AND c.contsRvsnSn IS NULL "
            + "      AND EXISTS (SELECT 1 FROM CmsContentRevision r WHERE r.contsSn = c.contsSn)) "
            + "  OR (:status = 'PENDING' AND c.kpngYn = 'N' AND ("
            + "      (c.contsRvsnSn IS NULL AND NOT EXISTS (SELECT 1 FROM CmsContentRevision r WHERE r.contsSn = c.contsSn)) "
            + "      OR EXISTS (SELECT 1 FROM CmsContentRevision r WHERE r.contsRvsnSn = c.contsRvsnSn "
            + "          AND (r.contsTtl <> c.contsTtl OR r.contsExpln <> c.contsExpln "
            + "               OR (r.contsExpln IS NULL AND LENGTH(c.contsExpln) > 0) "
            + "               OR (c.contsExpln IS NULL AND LENGTH(r.contsExpln) > 0) "
            + "               OR r.contsDocCn <> c.contsDocCn))))) "
            + "ORDER BY c.mdfcnDt DESC, c.contsSn DESC")
    Page<CmsContent> search(@Param("keyword") String keyword, @Param("status") String status, Pageable pageable);
}
