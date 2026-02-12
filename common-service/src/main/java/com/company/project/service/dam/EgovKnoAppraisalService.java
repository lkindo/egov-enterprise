package com.company.project.service.dam;

import com.company.project.domain.dam.KnowledgeInfSearchResult;
import com.company.project.service.dam.dto.KnowledgeDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovKnoAppraisalService {
    Page<KnowledgeInfSearchResult> selectKnoAppraisalList(String emplyrId, String searchCondition, String searchKeyword,
            Pageable pageable);

    KnowledgeDto selectKnoAppraisalDetail(String knoId);

    void updateKnoAppraisal(KnowledgeDto knowledgeDto);
}
