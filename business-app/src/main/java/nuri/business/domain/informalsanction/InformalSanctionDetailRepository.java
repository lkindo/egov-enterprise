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

    @Query("""
            select d from InformalSanctionDetail d, InformalSanction s
            where d.id.ifmlAtrzSn in :ids and s.ifmlAtrzSn = d.id.ifmlAtrzSn
              and ((s.aplcntId = :actor and d.id.atrzCycl = s.atrzCycl)
                or (s.aplcntId <> :actor and d.id.atrzCycl =
                    (select max(p.id.atrzCycl) from InformalSanctionDetail p
                     where p.id.ifmlAtrzSn = d.id.ifmlAtrzSn and p.id.userId = :actor)))
            order by d.id.ifmlAtrzSn, d.id.atrzSeq, d.id.userId
            """)
    List<InformalSanctionDetail> findVisibleForDocuments(@Param("ids") Collection<Long> ids,
                                                        @Param("actor") String actor);
}
