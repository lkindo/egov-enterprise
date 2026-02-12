package com.company.project.service.dam;

import com.company.project.domain.dam.ProfessionalSearchResult;
import com.company.project.service.dam.dto.ProfessionalDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovKnoSpecialistService {
    Page<ProfessionalSearchResult> selectKnoSpecialistList(String searchCondition, String searchKeyword,
            Pageable pageable);

    ProfessionalDto selectKnoSpecialistDetail(String speId, String knoTypeCd, String appTypeCd);

    void insertKnoSpecialist(ProfessionalDto professionalDto);

    void updateKnoSpecialist(ProfessionalDto professionalDto);

    void deleteKnoSpecialist(String speId, String knoTypeCd, String appTypeCd);
}
