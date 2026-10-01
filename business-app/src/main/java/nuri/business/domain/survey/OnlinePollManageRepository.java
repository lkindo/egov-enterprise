package nuri.business.domain.survey;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface OnlinePollManageRepository extends JpaRepository<OnlinePollManage, Long> {
    List<OnlinePollManage> findByPollDsuseYnAndPollAtmcDsuseYn(String dsuseYn, String atmcDsuseYn);

    @Query("SELECT p FROM OnlinePollManage p WHERE LOWER(p.pollNm) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<OnlinePollManage> findByPollNmContaining(@Param("keyword") String keyword, Pageable pageable);
    
    /**
     * [2026-10-01 결정 21] 종류별 목록 — 만족도 조사(종류 코드가 codes 안)와 온라인 투표(그 밖·빈 값)는 다른 제품이다.
     */
    @Query("SELECT p FROM OnlinePollManage p WHERE ((:satisfaction = true AND p.pollKndCd IN :codes)"
            + " OR (:satisfaction = false AND (p.pollKndCd IS NULL OR p.pollKndCd NOT IN :codes)))"
            + " AND LOWER(p.pollNm) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<OnlinePollManage> findByKind(@Param("satisfaction") boolean satisfaction,
            @Param("codes") java.util.Collection<String> codes, @Param("keyword") String keyword, Pageable pageable);

    // legacy support
    default Page<OnlinePollManage> findByPollTtlContaining(String keyword, Pageable pageable) {
        return findByPollNmContaining(keyword, pageable);
    }
}
