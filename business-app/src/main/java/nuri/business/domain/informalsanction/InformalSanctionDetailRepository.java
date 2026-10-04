package nuri.business.domain.informalsanction;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;

public interface InformalSanctionDetailRepository extends JpaRepository<InformalSanctionDetail, InformalSanctionDetailId> {
    @Query("select d from InformalSanctionDetail d where d.id.ifmlAtrzSn = :id and d.id.atrzCycl = :cycle order by d.id.atrzSeq, d.id.userId")
    List<InformalSanctionDetail> findRevision(@Param("id") Long id, @Param("cycle") BigDecimal cycle);

    @Query("select d from InformalSanctionDetail d where d.id.ifmlAtrzSn in :ids order by d.id.ifmlAtrzSn, d.id.atrzCycl, d.id.atrzSeq, d.id.userId")
    List<InformalSanctionDetail> findForDocuments(@Param("ids") Collection<Long> ids);

    /**
     * 목록이 문서마다 보여 줄 결재선 — 신청자와 참조자(2026-10-04 D4)는 현재 차수를, 그 밖의 사람은 자기가 결재선에 든 마지막
     * 차수를 본다. 과거 결재자이면서 참조자인 사람은 참조자 쪽이 이긴다(참조자는 모든 차수를 읽는다).
     */
    @Query("""
            select d from InformalSanctionDetail d, InformalSanction s
            where d.id.ifmlAtrzSn in :ids and s.ifmlAtrzSn = d.id.ifmlAtrzSn
              and (((s.aplcntId = :actor
                      or exists (select r.id from InformalSanctionReference r
                                 where r.id.ifmlAtrzSn = s.ifmlAtrzSn and r.id.userId = :actor))
                    and d.id.atrzCycl = s.atrzCycl)
                or (s.aplcntId <> :actor
                    and not exists (select r.id from InformalSanctionReference r
                                    where r.id.ifmlAtrzSn = s.ifmlAtrzSn and r.id.userId = :actor)
                    and d.id.atrzCycl =
                    (select max(p.id.atrzCycl) from InformalSanctionDetail p
                     where p.id.ifmlAtrzSn = d.id.ifmlAtrzSn and p.id.userId = :actor)))
            order by d.id.ifmlAtrzSn, d.id.atrzSeq, d.id.userId
            """)
    List<InformalSanctionDetail> findVisibleForDocuments(@Param("ids") Collection<Long> ids,
                                                        @Param("actor") String actor);
}
