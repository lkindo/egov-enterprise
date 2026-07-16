package nuri.business.service.deptjob;

import nuri.business.service.deptjob.dto.DeptJobDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 부서업무 서비스 인터페이스
 */
public interface EgovDeptJobService {

    Page<DeptJobDto> getDeptJobList(String deptId, String deptJobbxId, String searchCondition, String keyword,
            Pageable pageable);

    DeptJobDto getDeptJob(String deptJobId);

    String createDeptJob(DeptJobDto dto);

    void updateDeptJob(String deptJobId, DeptJobDto dto);

    void deleteDeptJob(String deptJobId);
}
