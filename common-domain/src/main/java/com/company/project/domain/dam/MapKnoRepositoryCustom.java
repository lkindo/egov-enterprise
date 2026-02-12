package com.company.project.domain.dam;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface MapKnoRepositoryCustom {
    Page<MapKnoSearchResult> searchMapKno(String searchCondition, String searchKeyword, Pageable pageable);
}
