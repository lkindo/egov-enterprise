package nuri.business.service.department;

import nuri.business.service.department.dto.DeptManageDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface DeptManageService {
    Page<DeptManageDto> getDeptManageList(String keyword, @org.springframework.lang.NonNull Pageable pageable);

    DeptManageDto getDeptManage(String ognzId);

    void insertDeptManage(DeptManageDto dto);

    void updateDeptManage(DeptManageDto dto);

    void deleteDeptManage(String ognzId);
}
