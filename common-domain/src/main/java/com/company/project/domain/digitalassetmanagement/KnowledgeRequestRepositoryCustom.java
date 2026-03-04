package com.company.project.domain.digitalassetmanagement;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface KnowledgeRequestRepositoryCustom {
    Page<KnowledgeRequest> searchKnowledgeRequest(String searchCondition, String searchKeyword, Pageable pageable);
}