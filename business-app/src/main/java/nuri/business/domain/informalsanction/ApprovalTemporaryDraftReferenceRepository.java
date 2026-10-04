package nuri.business.domain.informalsanction;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface ApprovalTemporaryDraftReferenceRepository
        extends JpaRepository<ApprovalTemporaryDraftReference, ApprovalTemporaryDraftReferenceId> {

    @Query("select r from ApprovalTemporaryDraftReference r where r.id.ifmlAtrzTmprStrgSn in :ids "
            + "order by r.id.ifmlAtrzTmprStrgSn, r.crtDt, r.id.userId")
    List<ApprovalTemporaryDraftReference> findForDrafts(@Param("ids") Collection<Long> ids);

    /**
     * 참조자를 갈아끼우기 전에 지운다. 한 문장으로 바로 실행되므로 뒤이어 같은 사람을 다시 넣어도 기본 키가 부딪히지 않는다
     * ({@link ApprovalTemporaryDraftLineRepository#deleteForDraft} 와 같은 이유).
     */
    @Modifying(flushAutomatically = true)
    @Query("delete from ApprovalTemporaryDraftReference r where r.id.ifmlAtrzTmprStrgSn = :sn")
    int deleteForDraft(@Param("sn") Long sn);
}
