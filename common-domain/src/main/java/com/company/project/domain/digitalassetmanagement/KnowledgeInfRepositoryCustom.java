package com.company.project.domain.digitalassetmanagement;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface KnowledgeInfRepositoryCustom {
    Page<KnowledgeInfSearchResult> searchKnowledgeInf(String searchCondition, String searchKeyword, Pageable pageable);
}