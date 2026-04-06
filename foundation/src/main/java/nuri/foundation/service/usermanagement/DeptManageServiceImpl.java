package nuri.foundation.service.usermanagement;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.foundation.domain.user.entity.DeptManage;
import nuri.foundation.domain.user.repository.DeptManageRepository;
import nuri.foundation.service.usermanagement.dto.DeptManageDto;
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
    public DeptManageDto getDeptManage(String orgnztId) {
        return deptManageRepository.findById(Objects.requireNonNull(orgnztId))
                .map(DeptManageDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void insertDeptManage(DeptManageDto dto) {
        DeptManage entity = DeptManage.builder()
                .orgnztId(dto.getOrgnztId())
                .orgnztNm(dto.getOrgnztNm())
                .orgnztDc(dto.getOrgnztDc())
                .build();
        deptManageRepository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void updateDeptManage(DeptManageDto dto) {
        DeptManage entity = deptManageRepository.findById(Objects.requireNonNull(dto.getOrgnztId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getOrgnztNm(), dto.getOrgnztDc());
    }

    @Override
    @Transactional
    public void deleteDeptManage(String orgnztId) {
        deptManageRepository.deleteById(Objects.requireNonNull(orgnztId));
    }
}
