package nuri.business.domain.informalsanction;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface ApprovalSavedLineApproverRepository
        extends JpaRepository<ApprovalSavedLineApprover, ApprovalSavedLineApproverId> {

    @Query("select a from ApprovalSavedLineApprover a where a.id.ifmlAtrzIndvAplnSn in :ids "
            + "order by a.id.ifmlAtrzIndvAplnSn, a.id.atrzSeq, a.id.userId")
    List<ApprovalSavedLineApprover> findForLines(@Param("ids") Collection<Long> ids);

    /**
     * 결재선을 갈아끼우기 전에 지운다. 한 문장으로 바로 실행되므로 뒤이어 같은 기본 키(단계·사람)를 다시 넣어도 부딪히지 않는다
     * ({@link ApprovalTemporaryDraftLineRepository#deleteForDraft} 와 같은 이유).
     */
    @Modifying(flushAutomatically = true)
    @Query("delete from ApprovalSavedLineApprover a where a.id.ifmlAtrzIndvAplnSn = :sn")
    int deleteForLine(@Param("sn") Long sn);
}
