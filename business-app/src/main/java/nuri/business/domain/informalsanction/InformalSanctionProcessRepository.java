package nuri.business.domain.informalsanction;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface InformalSanctionProcessRepository extends JpaRepository<InformalSanctionProcess, Long> {

    @Query("select p from InformalSanctionProcess p where p.ifmlAtrzSn in :ids "
            + "order by p.ifmlAtrzSn, p.ifmlAtrzPrcsHstrySn")
    List<InformalSanctionProcess> findForDocuments(@Param("ids") Collection<Long> ids);

    /** 목록의 행동 힌트는 현재 차수만 사용한다. 상세의 참여 차수별 이력 조회와 구분한다. */
    @Query("select p from InformalSanctionProcess p, InformalSanction s "
            + "where p.ifmlAtrzSn in :ids and s.ifmlAtrzSn = p.ifmlAtrzSn and p.atrzCycl = s.atrzCycl "
            + "order by p.ifmlAtrzSn, p.ifmlAtrzPrcsHstrySn")
    List<InformalSanctionProcess> findForCurrentCycles(@Param("ids") Collection<Long> ids);
}
