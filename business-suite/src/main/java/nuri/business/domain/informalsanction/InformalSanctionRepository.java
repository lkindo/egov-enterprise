package nuri.business.domain.informalsanction;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 비정형 결재 Repository
 */
public interface InformalSanctionRepository extends JpaRepository<InformalSanction, String> {
    Page<InformalSanction> findByApplicantId(String applicantId, Pageable pageable);

    Page<InformalSanction> findBySanctionerId(String sanctionerId, Pageable pageable);

    Page<InformalSanction> findBySanctionerIdAndConfmAt(String sanctionerId, String confmAt, Pageable pageable);
}
