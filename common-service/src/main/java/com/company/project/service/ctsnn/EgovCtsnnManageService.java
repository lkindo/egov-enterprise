package com.company.project.service.ctsnn;

import com.company.project.service.ctsnn.dto.CtsnnDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovCtsnnManageService {
    Page<CtsnnDto> getCtsnnList(String keyword, Pageable pageable);
    Page<CtsnnDto> getMyCtsnnList(String userId, Pageable pageable);
    CtsnnDto getCtsnn(String ctsnnId);
    void insertCtsnn(String userId, CtsnnDto dto);
    void updateCtsnn(String ctsnnId, String userId, CtsnnDto dto);
    void deleteCtsnn(String ctsnnId);
    void confirmCtsnn(String ctsnnId, String confmAt, String returnResn);
}
