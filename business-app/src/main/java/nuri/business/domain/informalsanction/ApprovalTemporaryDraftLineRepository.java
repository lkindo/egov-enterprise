package nuri.business.domain.informalsanction;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface ApprovalTemporaryDraftLineRepository
        extends JpaRepository<ApprovalTemporaryDraftLine, ApprovalTemporaryDraftLineId> {

    @Query("select l from ApprovalTemporaryDraftLine l where l.id.ifmlAtrzTmprStrgSn in :ids "
            + "order by l.id.ifmlAtrzTmprStrgSn, l.id.atrzSeq, l.id.userId")
    List<ApprovalTemporaryDraftLine> findForDrafts(@Param("ids") Collection<Long> ids);

    /**
     * 결재선을 갈아끼우기 전에 지운다. 한 문장으로 바로 실행되므로 뒤이어 같은 기본 키(단계·사람)를 다시 넣어도
     * 부딪히지 않는다 — 엔티티 단위 삭제는 Hibernate 가 INSERT 를 DELETE 보다 먼저 내보내 기본 키 위반이 난다.
     */
    @Modifying(flushAutomatically = true)
    @Query("delete from ApprovalTemporaryDraftLine l where l.id.ifmlAtrzTmprStrgSn = :sn")
    int deleteForDraft(@Param("sn") Long sn);
}
