package nuri.business.domain.survey;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface OnlinePollManageRepository extends JpaRepository<OnlinePollManage, Long> {
    /** 항목 수정과 투표가 같은 부모 잠금을 써 응답 확인 뒤 새 투표가 끼어들지 못하게 한다. */
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM OnlinePollManage p WHERE p.pollSn = :pollSn")
    java.util.Optional<OnlinePollManage> findByIdForUpdate(@Param("pollSn") Long pollSn);

    /**
     * 투표는 부모를 고치지 않으므로 공유 잠금(FOR SHARE)이면 충분하다. 수정·삭제의 FOR NO KEY UPDATE 와는
     * 충돌해 응답 확인 뒤 끼어들기를 막고, 투표끼리는 서로 기다리지 않는다. 같은 사람의 중복 투표는
     * uk_tb_onln_poll_rslt_poll_voter 가 막는다.
     */
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_READ)
    @Query("SELECT p FROM OnlinePollManage p WHERE p.pollSn = :pollSn")
    java.util.Optional<OnlinePollManage> findByIdForShare(@Param("pollSn") Long pollSn);

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
}
