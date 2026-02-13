package com.company.project.domain.system.monitoring;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FileSysMntrngRepository extends JpaRepository<FileSysMntrng, String> {
    Page<FileSysMntrng> findByFileSysNmContaining(String fileSysNm, Pageable pageable);
}
