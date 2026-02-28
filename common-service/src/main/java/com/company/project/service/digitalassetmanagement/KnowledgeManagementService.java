package com.company.project.service.digitalassetmanagement;

import com.company.project.domain.dam.KnowledgeInfSearchResult;
import com.company.project.service.digitalassetmanagement.dto.KnowledgeDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface KnowledgeManagementService {
    Page<KnowledgeInfSearchResult> selectKnowledgeManagementList(String searchCondition, String searchKeyword,
            Pageable pageable);

    KnowledgeDto selectKnowledgeManagementDetail(String knoId, String emplyrId);

    void updateKnowledgeManagement(KnowledgeDto knowledgeDto);
}
