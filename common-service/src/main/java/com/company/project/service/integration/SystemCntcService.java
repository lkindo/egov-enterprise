package com.company.project.service.integration;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.integration.SystemCntc;
import com.company.project.domain.integration.SystemCntcRepository;
import com.company.project.service.integration.dto.SystemCntcDto;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * 시스템 연계 서비스 구현체
 */
@Service("egovSystemCntcService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SystemCntcService extends EgovAbstractServiceImpl {

    private final SystemCntcRepository systemCntcRepository;

    /**
     * 연계 목록 조회
     */
    public List<SystemCntcDto> selectSystemCntcList() {
        return systemCntcRepository.findAll().stream()
                .map(SystemCntcDto::from)
                .collect(Collectors.toList());
    }

    /**
     * 연계 상세 조회
     */
    public SystemCntcDto selectSystemCntcDetail(String cntcId) {
        return systemCntcRepository.findById(Objects.requireNonNull(cntcId))
                .map(SystemCntcDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    /**
     * 연계 등록
     */
    @Transactional
    public void insertSystemCntc(SystemCntcDto dto) {
        SystemCntc systemCntc = SystemCntc.builder()
                .cntcId(dto.getCntcId())
                .cntcNm(dto.getCntcNm())
                .cntcType(dto.getCntcType())
                .useAt(dto.getUseAt())
                .confmAt("N")
                .build();
        systemCntcRepository.save(systemCntc);
    }

    /**
     * 연계 승인
     */
    @Transactional
    public void approveSystemCntc(String cntcId) {
        SystemCntc systemCntc = systemCntcRepository.findById(Objects.requireNonNull(cntcId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        systemCntc.approve();
    }
}
