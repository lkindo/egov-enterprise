package com.company.project.domain.system;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface NtwrkRepositoryCustom {
    Page<Ntwrk> searchNtwrks(String manageIem, String userNm, Pageable pageable);
}