package com.company.project.service.digitalassetmanagement;

import com.company.project.domain.digitalassetmanagement.KnowledgeInfSearchResult;
import com.company.project.service.digitalassetmanagement.dto.KnowledgeDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 지식평가 서비스 인터페이스
 */
public interface KnowledgeAppraisalService {
    /**
     * 지식평가 목록 조회
     */
    Page<KnowledgeInfSearchResult> selectKnowledgeAppraisalList(String userId, String searchCondition,
            String searchKeyword,
            Pageable pageable);

    /**
     * 지식평가 상세 조회
     */
    KnowledgeDto selectKnowledgeAppraisalDetail(String knowledgeId);

    /**
     * 지식평가 수정
     */
    void updateKnowledgeAppraisal(KnowledgeDto knowledgeDto);
}
