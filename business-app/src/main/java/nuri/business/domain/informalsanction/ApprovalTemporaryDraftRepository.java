package nuri.business.domain.informalsanction;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * 결재 기안 임시저장(V2_122). 모든 조회·삭제는 번호와 기안자(esntlId)를 함께 조건으로 둔다 — 남의 임시저장은 없는 것과
 * 같게 보인다(존재를 드러내지 않는다).
 */
public interface ApprovalTemporaryDraftRepository extends JpaRepository<ApprovalTemporaryDraft, Long> {

    List<ApprovalTemporaryDraft> findTop20ByAplcntIdOrderByMdfcnDtDescIfmlAtrzTmprStrgSnDesc(String aplcntId);

    Optional<ApprovalTemporaryDraft> findByIfmlAtrzTmprStrgSnAndAplcntId(Long ifmlAtrzTmprStrgSn, String aplcntId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select d from ApprovalTemporaryDraft d where d.ifmlAtrzTmprStrgSn = :sn and d.aplcntId = :aplcntId")
    Optional<ApprovalTemporaryDraft> findOwnedForUpdate(@Param("sn") Long sn, @Param("aplcntId") String aplcntId);

    long countByAplcntId(String aplcntId);

    /**
     * 상신으로 지울 임시저장의 첨부 묶음(V2_151) — 지운 뒤 다른 업무에 남지 않은 묶음을 수거하려고 먼저 읽는다. 그 사이 다른 곳에서
     * 고쳤으면 버전이 달라 뒤따르는 지우기({@link #deleteOwnedVersion})가 실패하고 상신 전체가 되돌아간다.
     */
    @Query("select d.atchFileSn from ApprovalTemporaryDraft d where d.ifmlAtrzTmprStrgSn = :sn and d.aplcntId = :aplcntId "
            + "and d.atchFileSn is not null")
    Optional<Long> findAttachmentOfOwnedDraft(@Param("sn") Long sn, @Param("aplcntId") String aplcntId);

    /**
     * 상신과 함께 임시저장을 지운다 — 번호·기안자·버전이 모두 맞을 때만 지우고 지운 행 수를 돌려준다(0 이면 이미 상신했거나
     * 다른 곳에서 바뀐 것이다). 결재선 행은 FK(ON DELETE CASCADE)가 함께 지운다. 한 문장이라 두 탭이 같은 임시저장을
     * 동시에 상신해도 한쪽만 지운다.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from ApprovalTemporaryDraft d where d.ifmlAtrzTmprStrgSn = :sn and d.aplcntId = :aplcntId "
            + "and d.version = :version")
    int deleteOwnedVersion(@Param("sn") Long sn, @Param("aplcntId") String aplcntId, @Param("version") Integer version);
}
