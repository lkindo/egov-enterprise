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
 * ?úÏä§???∞Í≥Ñ ?úÎπÑ??Íµ¨ÌòÑÏ≤? */
@Service("egovSystemCntcService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SystemCntcService extends EgovAbstractServiceImpl {

    private final SystemCntcRepository systemCntcRepository;

    /**
     * ?∞Í≥Ñ Î™©Î°ù Ï°∞Ìöå
     */
    public List<SystemCntcDto> selectSystemCntcList() {
        return systemCntcRepository.findAll().stream()
                .map(SystemCntcDto::from)
                .collect(Collectors.toList());
    }

    /**
     * ?∞Í≥Ñ ?ÅÏÑ∏ Ï°∞Ìöå
     */
    public SystemCntcDto selectSystemCntcDetail(String cntcId) {
        return systemCntcRepository.findById(Objects.requireNonNull(cntcId))
                .map(SystemCntcDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    /**
     * ?∞Í≥Ñ ?±Î°ù
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
     * ?∞Í≥Ñ ?πÏù∏
     */
    @Transactional
    public void approveSystemCntc(String cntcId) {
        SystemCntc systemCntc = systemCntcRepository.findById(Objects.requireNonNull(cntcId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        systemCntc.approve();
    }
}
