package com.company.project.service.digitalassetmanagement;

import com.company.project.domain.note.Note; // Wait, why did I see Note here? Let me check the original.
import com.company.project.domain.dam.KnowledgeInfSearchResult;
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
