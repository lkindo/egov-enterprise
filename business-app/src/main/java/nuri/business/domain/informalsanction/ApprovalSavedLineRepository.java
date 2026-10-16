package nuri.business.domain.informalsanction;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * 나의 결재선(V2_129). 모든 조회·삭제는 번호와 주인(esntlId)을 함께 조건으로 둔다 — 남의 결재선은 없는 것과 같게 보인다
 * (존재를 드러내지 않는다).
 */
public interface ApprovalSavedLineRepository extends JpaRepository<ApprovalSavedLine, Long> {

    /** 기안 화면의 '나의 결재선' 목록 — 이름 순. 한 사람이 20개까지라 한 번에 읽는다. */
    List<ApprovalSavedLine> findTop20ByUserIdOrderByAplnNmAscIfmlAtrzIndvAplnSnAsc(String userId);

    Optional<ApprovalSavedLine> findByIfmlAtrzIndvAplnSnAndUserId(Long ifmlAtrzIndvAplnSn, String userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select l from ApprovalSavedLine l where l.ifmlAtrzIndvAplnSn = :sn and l.userId = :userId")
    Optional<ApprovalSavedLine> findOwnedForUpdate(@Param("sn") Long sn, @Param("userId") String userId);

    long countByUserId(String userId);

    /** 같은 주인 안에서 이름이 겹치는가(새로 저장할 때). */
    boolean existsByUserIdAndAplnNm(String userId, String aplnNm);

    /** 같은 주인 안에서 이름이 겹치는가 — 고치는 결재선 자신은 빼고 본다(이름을 그대로 두고 결재선만 바꾸는 저장). */
    boolean existsByUserIdAndAplnNmAndIfmlAtrzIndvAplnSnNot(String userId, String aplnNm, Long ifmlAtrzIndvAplnSn);
}
