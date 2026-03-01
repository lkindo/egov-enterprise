package com.company.project.domain.digitalassetmanagement;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ProfessionalRepositoryCustom {
    Page<ProfessionalSearchResult> searchProfessionals(String searchCondition, String searchKeyword, Pageable pageable);
}
