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
}
