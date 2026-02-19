package com.company.project.service.user;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.user.entity.DeptManage;
import com.company.project.domain.user.repository.DeptManageRepository;
import com.company.project.service.user.dto.DeptManageDto;
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
