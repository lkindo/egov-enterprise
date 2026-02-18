package com.company.project.service.ctsnn;

import com.company.project.service.ctsnn.dto.CtsnnDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovCtsnnService {
    CtsnnDto getCtsnn(@org.springframework.lang.NonNull String ctsnnId);

    void registerCtsnn(CtsnnDto dto);

    void updateCtsnn(CtsnnDto dto);

    void deleteCtsnn(@org.springframework.lang.NonNull String ctsnnId);

    void approveCtsnn(@org.springframework.lang.NonNull String ctsnnId, String confmAt, String returnResn,
            String lastUpdusrId);

    Page<CtsnnDto> getCtsnnList(String searchKeyword, String ctsnnCd,
            @org.springframework.lang.NonNull Pageable pageable);
}
