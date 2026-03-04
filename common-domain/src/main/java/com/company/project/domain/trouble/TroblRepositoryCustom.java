package com.company.project.domain.trouble;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface TroblRepositoryCustom {
    Page<Trobl> searchTroblReqsts(String troblNm, String troblKnd, List<String> processStatuses, Pageable pageable);
}
