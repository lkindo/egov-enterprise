package com.company.project.service.dam;

import com.company.project.domain.dam.KnowledgeInf;
import com.company.project.service.dam.dto.KnowledgeDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovKnoPersonalService {
    Page<KnowledgeInf> selectKnoPersonalList(String searchCondition, String searchKeyword, String uniqId,
            Pageable pageable) throws Exception;

    KnowledgeDto selectKnoPersonalDetail(String knoId) throws Exception;

    void insertKnoPersonal(KnowledgeDto knowledgeDto) throws Exception;

    void updateKnoPersonal(KnowledgeDto knowledgeDto) throws Exception;

    void deleteKnoPersonal(String knoId) throws Exception;
}
