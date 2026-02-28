package com.company.project.service.digitalassetmanagement;

import com.company.project.domain.dam.KnowledgeInf;
import com.company.project.service.digitalassetmanagement.dto.KnowledgeDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface KnowledgePersonalService {
    Page<KnowledgeInf> selectKnowledgePersonalList(String searchCondition, String searchKeyword, String uniqId,
            Pageable pageable) throws Exception;

    KnowledgeDto selectKnowledgePersonalDetail(String knoId) throws Exception;

    void insertKnowledgePersonal(KnowledgeDto knowledgeDto) throws Exception;

    void updateKnowledgePersonal(KnowledgeDto knowledgeDto) throws Exception;

    void deleteKnowledgePersonal(String knoId) throws Exception;
}
