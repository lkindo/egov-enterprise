package com.company.project.service.usermanagement;

import com.company.project.service.user.dto.GeneralUserDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovMberManageService {
    Page<GeneralUserDto> getMberList(String keyword, Pageable pageable);

    GeneralUserDto getMber(String esntlId);

    void insertMber(GeneralUserDto dto);

    void updateMber(GeneralUserDto dto);

    void deleteMber(String esntlId);

    void updatePassword(String esntlId, String password);
}
