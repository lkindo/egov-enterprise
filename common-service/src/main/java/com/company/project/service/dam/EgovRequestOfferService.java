package com.company.project.service.dam;

import com.company.project.domain.dam.KnowledgeRequest;
import com.company.project.service.dam.dto.KnowledgeRequestDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovRequestOfferService {
    Page<KnowledgeRequest> selectRequestOfferList(String searchCondition, String searchKeyword, Pageable pageable)
            throws Exception;

    KnowledgeRequestDto selectRequestOfferDetail(String knoId) throws Exception;

    void insertRequestOffer(KnowledgeRequestDto requestDto) throws Exception;

    void updateRequestOffer(KnowledgeRequestDto requestDto) throws Exception;

    void deleteRequestOffer(String knoId) throws Exception;

    boolean isSpecialist(String uniqId) throws Exception;

    int getReplyCount(String knoId) throws Exception;
}
