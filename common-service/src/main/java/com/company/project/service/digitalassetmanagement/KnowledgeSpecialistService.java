package com.company.project.service.digitalassetmanagement;

import com.company.project.domain.digitalassetmanagement.ProfessionalSearchResult;
import com.company.project.service.digitalassetmanagement.dto.ProfessionalDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 지식 전문가 서비스 인터페이스
 */
public interface KnowledgeSpecialistService {
    /**
     * 지식 전문가 목록 조회
     */
    Page<ProfessionalSearchResult> selectKnowledgeSpecialistList(String searchCondition, String searchKeyword,
            Pageable pageable);

    /**
     * 지식 전문가 상세 조회
     */
    ProfessionalDto selectKnowledgeSpecialistDetail(String expertId, String typeCode, String assessmentLevel);

    /**
     * 지식 전문가 등록
     */
    void insertKnowledgeSpecialist(ProfessionalDto professionalDto);

    /**
     * 지식 전문가 수정
     */
    void updateKnowledgeSpecialist(ProfessionalDto professionalDto);

    /**
     * 지식 전문가 삭제
     */
    void deleteKnowledgeSpecialist(String expertId, String typeCode, String assessmentLevel);
}