package nuri.business.service.usermanagement;

import nuri.business.service.usermanagement.dto.DeptManageDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovDeptManageService {
    Page<DeptManageDto> getDeptManageList(String keyword, @org.springframework.lang.NonNull Pageable pageable);

    DeptManageDto getDeptManage(String ognzId);

    void insertDeptManage(DeptManageDto dto);

    void updateDeptManage(DeptManageDto dto);

    void deleteDeptManage(String ognzId);
}
