package com.company.project.service.user;

import com.company.project.service.user.dto.DeptManageDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovDeptManageService {
    Page<DeptManageDto> getDeptManageList(String keyword, @org.springframework.lang.NonNull Pageable pageable);

    DeptManageDto getDeptManage(String orgnztId);

    void insertDeptManage(DeptManageDto dto);

    void updateDeptManage(DeptManageDto dto);

    void deleteDeptManage(String orgnztId);
}
