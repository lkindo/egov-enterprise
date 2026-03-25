package com.company.project.foundation.domain.isg;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InternetSvcGuidanceRepository extends JpaRepository<InternetSvcGuidance, String> {
    Page<InternetSvcGuidance> findByIntnetSvcNmContaining(String intnetSvcNm, Pageable pageable);
}
