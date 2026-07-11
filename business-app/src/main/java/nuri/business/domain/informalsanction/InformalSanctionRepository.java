package nuri.business.domain.informalsanction;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 비정형 결재 Repository
 */
public interface InformalSanctionRepository extends JpaRepository<InformalSanction, String> {
    Page<InformalSanction> findByAplcntId(String aplcntId, Pageable pageable);

    Page<InformalSanction> findByAprvrId(String aprvrId, Pageable pageable);

    Page<InformalSanction> findByAprvrIdAndAprvYn(String aprvrId, String aprvYn, Pageable pageable);
}
