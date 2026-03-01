package com.company.project.service.digitalassetmanagement;

import com.company.project.domain.digitalassetmanagement.ProfessionalSearchResult;
import com.company.project.service.digitalassetmanagement.dto.ProfessionalDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface KnowledgeSpecialistService {
    Page<ProfessionalSearchResult> selectKnowledgeSpecialistList(String searchCondition, String searchKeyword,
            Pageable pageable);

    ProfessionalDto selectKnowledgeSpecialistDetail(String speId, String knoTypeCd, String appTypeCd);

    void insertKnowledgeSpecialist(ProfessionalDto professionalDto);

    void updateKnowledgeSpecialist(ProfessionalDto professionalDto);

    void deleteKnowledgeSpecialist(String speId, String knoTypeCd, String appTypeCd);
}
