package nuri.business.domain.informalsanction;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface InformalSanctionReferenceRepository
        extends JpaRepository<InformalSanctionReference, InformalSanctionReferenceId> {

    /**
     * 여러 문서의 참조 행을 한 번에 읽는다(목록이 문서마다 조회하지 않게). 지정은 차수 단위라 한 사람이 여러 행일 수 있다 —
     * 차수 순, 같은 차수 안에서는 지정한 순서대로다(같은 사람의 뒤 행이 더 최근 지정이다).
     */
    @Query("select r from InformalSanctionReference r where r.id.ifmlAtrzSn in :ids "
            + "order by r.id.ifmlAtrzSn, r.id.atrzCycl, r.crtDt, r.id.userId")
    List<InformalSanctionReference> findForDocuments(@Param("ids") Collection<Long> ids);
}
