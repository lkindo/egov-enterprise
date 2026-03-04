package com.company.project.service.deptjob;

import com.company.project.service.deptjob.dto.DeptJobDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * ???뾽????퉬???명꽣??씠??
 */
public interface EgovDeptJobService {

    Page<DeptJobDto> getDeptJobList(String deptId, String deptJobbxId, String searchCondition, String keyword,
            Pageable pageable);

    DeptJobDto getDeptJob(String deptJobId);

    String createDeptJob(DeptJobDto dto);

    void updateDeptJob(String deptJobId, DeptJobDto dto);

    void deleteDeptJob(String deptJobId);
}