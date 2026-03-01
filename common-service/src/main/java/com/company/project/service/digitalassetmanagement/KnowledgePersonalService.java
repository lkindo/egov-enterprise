package com.company.project.service.digitalassetmanagement;

import com.company.project.domain.digitalassetmanagement.KnowledgeInf;
import com.company.project.service.digitalassetmanagement.dto.KnowledgeDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 개인 지식정보 서비스 인터페이스
 */
public interface KnowledgePersonalService {
    /**
     * 개인 지식정보 목록 조회
     */
    Page<KnowledgeInf> selectKnowledgePersonalList(String searchCondition, String searchKeyword, String userId,
            Pageable pageable) throws Exception;

    /**
     * 개인 지식정보 상세 조회
     */
    KnowledgeDto selectKnowledgePersonalDetail(String knowledgeId) throws Exception;

    /**
     * 개인 지식정보 등록
     */
    void insertKnowledgePersonal(KnowledgeDto knowledgeDto) throws Exception;

    /**
     * 개인 지식정보 수정
     */
    void updateKnowledgePersonal(KnowledgeDto knowledgeDto) throws Exception;

    /**
     * 개인 지식정보 삭제
     */
    void deleteKnowledgePersonal(String knowledgeId) throws Exception;
}
