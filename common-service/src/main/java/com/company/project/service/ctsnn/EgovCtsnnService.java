package com.company.project.service.ctsnn;

import com.company.project.service.ctsnn.dto.CtsnnDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovCtsnnService {
    CtsnnDto getCtsnn(String ctsnnId);

    void registerCtsnn(CtsnnDto dto);

    void updateCtsnn(CtsnnDto dto);

    void deleteCtsnn(String ctsnnId);

    void approveCtsnn(String ctsnnId, String confmAt, String returnResn, String lastUpdusrId);

    Page<CtsnnDto> getCtsnnList(String searchKeyword, String ctsnnCd, Pageable pageable);
}
