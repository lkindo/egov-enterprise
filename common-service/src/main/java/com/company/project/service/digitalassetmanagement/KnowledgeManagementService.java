package com.company.project.service.digitalassetmanagement;

import com.company.project.domain.digitalassetmanagement.KnowledgeInfSearchResult;
import com.company.project.service.digitalassetmanagement.dto.KnowledgeDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 지식정보 관리 서비스 인터페이스
 */
public interface KnowledgeManagementService {
    /**
     * 지식정보 목록 조회
     */
    Page<KnowledgeInfSearchResult> selectKnowledgeManagementList(String searchCondition, String searchKeyword,
            Pageable pageable);

    /**
     * 지식정보 상세 조회
     */
    KnowledgeDto selectKnowledgeManagementDetail(String knowledgeId, String userId);

    /**
     * 지식정보 수정
     */
    void updateKnowledgeManagement(KnowledgeDto knowledgeDto);
}