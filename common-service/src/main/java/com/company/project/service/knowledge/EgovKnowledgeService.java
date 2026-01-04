package com.company.project.service.knowledge;

import com.company.project.service.knowledge.dto.KnowledgeDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 지식관리 서비스 인터페이스
 */
public interface EgovKnowledgeService {

    Page<KnowledgeDto> getKnowledgeList(String keyword, Pageable pageable);

    KnowledgeDto getKnowledge(String knoId);

    String createKnowledge(String userId, KnowledgeDto dto);

    void updateKnowledge(String knoId, String userId, KnowledgeDto dto);

    void deleteKnowledge(String knoId);
}
