package com.company.project.domain.system.monitoring;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DbMntrngRepository extends JpaRepository<DbMntrng, String> {
    Page<DbMntrng> findByDataSourcNmContaining(String dataSourcNm, Pageable pageable);
}