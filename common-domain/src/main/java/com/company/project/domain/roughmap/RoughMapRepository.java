package com.company.project.domain.roughmap;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 약도 정보 Repository
 */
@org.springframework.stereotype.Repository("roughmapRoughMapRepository")
public interface RoughMapRepository extends JpaRepository<RoughMap, String> {
    Page<RoughMap> findByRoughMapSjContaining(String roughMapSj, Pageable pageable);
}
