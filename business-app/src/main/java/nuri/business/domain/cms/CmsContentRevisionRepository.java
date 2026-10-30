package nuri.business.domain.cms;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CmsContentRevisionRepository extends JpaRepository<CmsContentRevision, Long>, CmsRevisionPurgePermit {

    /** 게시 이력. 최신이 앞이다. 페이지당 게시 횟수는 운영자가 직접 누른 수라 페이징하지 않는다. */
    List<CmsContentRevision> findByContsSnOrderByContsRvsnSnDesc(Long contsSn);

    Optional<CmsContentRevision> findByContsRvsnSnAndContsSn(Long contsRvsnSn, Long contsSn);

    /**
     * 리비전 번호(v1, v2 …)는 저장하지 않고 같은 페이지에서 앞선 게시 수로 계산한다. 게시본은 고치지 않고, 지우는 길은 파기(ADR-0042)
     * 하나다 — 파기한 게시본보다 뒤의 번호는 하나씩 당겨진다(파기 기록은 민감 작업 감사에 남는다).
     */
    long countByContsSnAndContsRvsnSnLessThanEqual(Long contsSn, Long contsRvsnSn);

    boolean existsByContsSn(Long contsSn);

    long countByContsSn(Long contsSn);

    /** 게시한 적이 있는 페이지 — 목록의 '초안'과 '게시 중지'를 한 번에 가른다. */
    @Query("SELECT DISTINCT r.contsSn FROM CmsContentRevision r WHERE r.contsSn IN :contsSns")
    List<Long> findPublishedOnceAmong(@Param("contsSns") java.util.Collection<Long> contsSns);

    /**
     * 사용자 화면의 안내 페이지 목록(ADR-0042). 게시 중이고 보관하지 않은 페이지의 현재 게시본만, 최근 게시 순으로. 검색어는 게시본의
     * 제목·요약 부분 일치이고 % 와 _ 는 글자 그대로 찾는다(호출자가 \ 로 막아 넘긴다).
     */
    @Query(value = "SELECT r FROM CmsContentRevision r, CmsContent c WHERE c.contsRvsnSn = r.contsRvsnSn AND c.kpngYn = 'N' "
            + "AND (LOWER(r.contsTtl) LIKE LOWER(CONCAT('%', :keyword, '%')) ESCAPE '\\' "
            + "     OR LOWER(COALESCE(r.contsExpln, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) ESCAPE '\\') "
            + "ORDER BY r.crtDt DESC, r.contsRvsnSn DESC",
            countQuery = "SELECT COUNT(r) FROM CmsContentRevision r, CmsContent c WHERE c.contsRvsnSn = r.contsRvsnSn "
                    + "AND c.kpngYn = 'N' "
                    + "AND (LOWER(r.contsTtl) LIKE LOWER(CONCAT('%', :keyword, '%')) ESCAPE '\\' "
                    + "     OR LOWER(COALESCE(r.contsExpln, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) ESCAPE '\\')")
    Page<CmsContentRevision> searchPublished(@Param("keyword") String keyword, Pageable pageable);

    // ---- 파기(ADR-0042) — 게시본 불변 트리거는 이 트랜잭션 표시가 켜진 동안에만 삭제를 받는다(수정은 늘 거부한다) ------------------------

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "DELETE FROM tb_cms_conts_rvsn_file WHERE conts_sn = :contsSn AND conts_rvsn_sn = :contsRvsnSn",
            nativeQuery = true)
    int purgeRevisionFiles(@Param("contsSn") Long contsSn, @Param("contsRvsnSn") Long contsRvsnSn);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "DELETE FROM tb_cms_conts_rvsn WHERE conts_sn = :contsSn AND conts_rvsn_sn = :contsRvsnSn", nativeQuery = true)
    int purgeRevision(@Param("contsSn") Long contsSn, @Param("contsRvsnSn") Long contsRvsnSn);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "DELETE FROM tb_cms_conts_rvsn_file WHERE conts_sn = :contsSn", nativeQuery = true)
    int purgeAllRevisionFiles(@Param("contsSn") Long contsSn);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "DELETE FROM tb_cms_conts_rvsn WHERE conts_sn = :contsSn", nativeQuery = true)
    int purgeAllRevisions(@Param("contsSn") Long contsSn);
}
