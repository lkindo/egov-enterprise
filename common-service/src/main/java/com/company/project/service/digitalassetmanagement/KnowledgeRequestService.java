package com.company.project.service.digitalassetmanagement;

import com.company.project.domain.digitalassetmanagement.KnowledgeRequest;
import com.company.project.service.digitalassetmanagement.dto.KnowledgeRequestDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 지식요청/답변 서비스 인터페이스
 */
public interface KnowledgeRequestService {
    /**
     * 지식요청 목록 조회
     */
    Page<KnowledgeRequest> selectKnowledgeRequestList(String searchCondition, String searchKeyword, Pageable pageable)
            throws Exception;

    /**
     * 지식요청 상세 조회
     */
    KnowledgeRequestDto selectKnowledgeRequestDetail(String knowledgeId) throws Exception;

    /**
     * 지식요청 등록
     */
    void insertKnowledgeRequest(KnowledgeRequestDto requestDto) throws Exception;

    /**
     * 지식요청 수정
     */
    void updateKnowledgeRequest(KnowledgeRequestDto requestDto) throws Exception;

    /**
     * 지식요청 삭제
     */
    void deleteKnowledgeRequest(String knowledgeId) throws Exception;

    /**
     * 전문가 여부 확인
     */
    boolean isSpecialist(String userId) throws Exception;

    /**
     * 답변 개수 조회
     */
    int getReplyCount(String knowledgeId) throws Exception;
}