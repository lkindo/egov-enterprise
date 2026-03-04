package com.company.project.service.consult;

import com.company.project.service.consult.dto.CnsltManageDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovCnsltService {
    Page<CnsltManageDto> getCnsltList(String keyword, @org.springframework.lang.NonNull Pageable pageable);

    CnsltManageDto getCnslt(String cnsltId);

    void insertCnslt(CnsltManageDto dto);

    void updateCnslt(CnsltManageDto dto);

    void deleteCnslt(String cnsltId);

    void answerCnslt(String cnsltId, String answerCn);
}