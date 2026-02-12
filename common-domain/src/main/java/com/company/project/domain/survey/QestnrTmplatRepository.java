package com.company.project.domain.survey;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 설문템플릿 Repository
 */
public interface QestnrTmplatRepository extends JpaRepository<QestnrTmplat, String> {
    Page<QestnrTmplat> findByQestnrTmplatTyContaining(String qestnrTmplatTy, Pageable pageable);
}
