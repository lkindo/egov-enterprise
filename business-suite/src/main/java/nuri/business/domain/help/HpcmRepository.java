package nuri.business.domain.help;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 도움말 Repository
 */
public interface HpcmRepository extends JpaRepository<Hpcm, String> {
    Page<Hpcm> findByHpcmDfContaining(String hpcmDf, Pageable pageable);
}
