package com.company.project.service.survey;

import com.company.project.service.survey.dto.CounselDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovCounselService {
    void registerCounsel(CounselDto dto);

    void updateCounsel(CounselDto dto);

    void deleteCounsel(String counselId);

    void answerCounsel(CounselDto dto);

    CounselDto getCounsel(String counselId);

    Page<CounselDto> getCounselList(String searchKeyword, Pageable pageable);
}