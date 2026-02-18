package com.company.project.service.ctsnn;

import com.company.project.service.ctsnn.dto.CtsnnDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovCtsnnManageService {
    Page<CtsnnDto> getCtsnnList(String keyword, @org.springframework.lang.NonNull Pageable pageable);

    Page<CtsnnDto> getMyCtsnnList(String userId, @org.springframework.lang.NonNull Pageable pageable);

    CtsnnDto getCtsnn(@org.springframework.lang.NonNull String ctsnnId);

    void insertCtsnn(String userId, CtsnnDto dto);

    void updateCtsnn(String ctsnnId, String userId, CtsnnDto dto);

    void deleteCtsnn(@org.springframework.lang.NonNull String ctsnnId);

    void confirmCtsnn(@org.springframework.lang.NonNull String ctsnnId, String confmAt, String returnResn);
}
