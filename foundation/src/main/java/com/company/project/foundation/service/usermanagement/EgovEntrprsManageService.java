package com.company.project.foundation.service.usermanagement;

import com.company.project.foundation.service.usermanagement.dto.EnterpriseUserDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovEntrprsManageService {
    Page<EnterpriseUserDto> getEntrprsList(String keyword, Pageable pageable);

    EnterpriseUserDto getEntrprs(String esntlId);

    void insertEntrprs(EnterpriseUserDto dto);

    void updateEntrprs(EnterpriseUserDto dto);

    void deleteEntrprs(String esntlId);

    void updatePassword(String esntlId, String password);
}
