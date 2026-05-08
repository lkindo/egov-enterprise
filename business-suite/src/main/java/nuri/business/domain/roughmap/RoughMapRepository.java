package nuri.business.domain.roughmap;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 약도 저장소 Repository
 */
@org.springframework.stereotype.Repository("roughmapRoughMapRepository")
public interface RoughMapRepository extends JpaRepository<RoughMap, String> {
    Page<RoughMap> findByRoughMapSjContaining(String roughMapSj, Pageable pageable);
}
