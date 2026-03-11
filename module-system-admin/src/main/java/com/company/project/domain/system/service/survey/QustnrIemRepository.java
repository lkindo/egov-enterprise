package com.company.project.domain.system.service.survey;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/**
 * ??뿅?????Repository
 */
public interface QustnrIemRepository extends JpaRepository<QustnrIem, String> {
    Page<QustnrIem> findByQestnrQesitmId(String qestnrQesitmId, Pageable pageable);
    List<QustnrIem> findByQestnrQesitmIdOrderByIemSnAsc(String qestnrQesitmId);
}
