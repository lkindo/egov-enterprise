package nuri.business.service.usermanagement;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.business.domain.user.entity.DeptManage;
import nuri.business.domain.user.repository.DeptManageRepository;
import nuri.business.service.usermanagement.dto.DeptManageDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DeptManageServiceImpl implements EgovDeptManageService {

    private final DeptManageRepository deptManageRepository;

    @Override
    public Page<DeptManageDto> getDeptManageList(String keyword, @org.springframework.lang.NonNull Pageable pageable) {
        return deptManageRepository.searchDeptManages(keyword, pageable).map(DeptManageDto::from);
    }

    @Override
    public DeptManageDto getDeptManage(String ognzId) {
        return deptManageRepository.findById(Objects.requireNonNull(ognzId))
                .map(DeptManageDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void insertDeptManage(DeptManageDto dto) {
        DeptManage entity = DeptManage.builder()
                .ognzId(dto.getOgnzId())
                .ognzNm(dto.getOgnzNm())
                .ognzExpln(dto.getOgnzExpln())
                .build();
        deptManageRepository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void updateDeptManage(DeptManageDto dto) {
        DeptManage entity = deptManageRepository.findById(Objects.requireNonNull(dto.getOgnzId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getOgnzNm(), dto.getOgnzExpln());
    }

    @Override
    @Transactional
    public void deleteDeptManage(String ognzId) {
        deptManageRepository.deleteById(Objects.requireNonNull(ognzId));
    }
}
