package nuri.business.domain.informalsanction;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface InformalSanctionHistoryRepository extends JpaRepository<InformalSanctionHistory, InformalSanctionHistoryId> {
    @Query("select h from InformalSanctionHistory h where h.id.ifmlAtrzSn in :ids order by h.id.ifmlAtrzSn, h.id.atrzCycl desc")
    List<InformalSanctionHistory> findForDocuments(@Param("ids") Collection<Long> ids);

    /** 목록의 차수 이력 — 결재선 쪽 질의({@link InformalSanctionDetailRepository#findVisibleForDocuments})와 같은 차수를 고른다. */
    @Query("""
            select h from InformalSanctionHistory h, InformalSanction s
            where h.id.ifmlAtrzSn in :ids and s.ifmlAtrzSn = h.id.ifmlAtrzSn
              and (((s.aplcntId = :actor
                      or exists (select r.id from InformalSanctionReference r
                                 where r.id.ifmlAtrzSn = s.ifmlAtrzSn and r.id.userId = :actor))
                    and h.id.atrzCycl = s.atrzCycl)
                or (s.aplcntId <> :actor
                    and not exists (select r.id from InformalSanctionReference r
                                    where r.id.ifmlAtrzSn = s.ifmlAtrzSn and r.id.userId = :actor)
                    and h.id.atrzCycl =
                    (select max(p.id.atrzCycl) from InformalSanctionDetail p
                     where p.id.ifmlAtrzSn = h.id.ifmlAtrzSn and p.id.userId = :actor)))
            order by h.id.ifmlAtrzSn
            """)
    List<InformalSanctionHistory> findVisibleForDocuments(@Param("ids") Collection<Long> ids,
                                                         @Param("actor") String actor);
}
