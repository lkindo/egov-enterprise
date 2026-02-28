package com.company.project.service.digitalassetmanagement;

import com.company.project.domain.dam.KnowledgeRequest;
import com.company.project.service.digitalassetmanagement.dto.KnowledgeRequestDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface KnowledgeRequestService {
    Page<KnowledgeRequest> selectKnowledgeRequestList(String searchCondition, String searchKeyword, Pageable pageable)
            throws Exception;

    KnowledgeRequestDto selectKnowledgeRequestDetail(String knoId) throws Exception;

    void insertKnowledgeRequest(KnowledgeRequestDto requestDto) throws Exception;

    void updateKnowledgeRequest(KnowledgeRequestDto requestDto) throws Exception;

    void deleteKnowledgeRequest(String knoId) throws Exception;

    boolean isSpecialist(String uniqId) throws Exception;

    int getReplyCount(String knoId) throws Exception;
}
