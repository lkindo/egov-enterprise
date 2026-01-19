package com.company.project.service.deptjob;

import com.company.project.service.deptjob.dto.DeptJobBoxDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 부서업무함 서비스 인터페이스
 */
public interface EgovDeptJobBoxService {

    Page<DeptJobBoxDto> getDeptJobBoxList(String keyword, Pageable pageable);

    Page<DeptJobBoxDto> getDeptJobBoxListByDept(String deptId, Pageable pageable);

    DeptJobBoxDto getDeptJobBox(String deptJobbxId);

    String createDeptJobBox(String userId, DeptJobBoxDto dto);

    void updateDeptJobBox(String deptJobbxId, String userId, DeptJobBoxDto dto);

    void deleteDeptJobBox(String deptJobbxId);
}
