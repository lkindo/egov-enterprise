package com.company.project.service.dam;

import com.company.project.domain.dam.KnowledgeInfSearchResult;
import com.company.project.service.dam.dto.KnowledgeDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovKnoManagementService {
    Page<KnowledgeInfSearchResult> selectKnoManagementList(String searchCondition, String searchKeyword,
            Pageable pageable);

    KnowledgeDto selectKnoManagementDetail(String knoId, String emplyrId);

    void updateKnoManagement(KnowledgeDto knowledgeDto);
}
