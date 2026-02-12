package com.company.project.service.user;

import com.company.project.service.user.dto.EnterpriseUserDto;
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
