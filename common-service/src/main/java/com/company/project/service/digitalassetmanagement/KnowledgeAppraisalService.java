package com.company.project.service.digitalassetmanagement;

import com.company.project.domain.digitalassetmanagement.KnowledgeInfSearchResult;
import com.company.project.service.digitalassetmanagement.dto.KnowledgeDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface KnowledgeAppraisalService {
    Page<KnowledgeInfSearchResult> selectKnowledgeAppraisalList(String emplyrId, String searchCondition,
            String searchKeyword,
            Pageable pageable);

    KnowledgeDto selectKnowledgeAppraisalDetail(String knoId);

    void updateKnowledgeAppraisal(KnowledgeDto knowledgeDto);
}
