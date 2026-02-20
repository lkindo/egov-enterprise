package com.company.project.service.integration;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.integration.SystemCntc;
import com.company.project.domain.integration.SystemCntcRepository;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

/**
 * ?쒖뒪???곌퀎 ?쒕퉬??援ы쁽泥?
 */
@Service("egovSystemCntcService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SystemCntcService extends EgovAbstractServiceImpl {

    private final SystemCntcRepository systemCntcRepository;

    /**
     * ?곌퀎 紐⑸줉 議고쉶
     */
    public List<SystemCntc> selectSystemCntcList() {
        return systemCntcRepository.findAll();
    }

    /**
     * ?곌퀎 ?곸꽭 議고쉶
     */
    public SystemCntc selectSystemCntcDetail(String cntcId) {
        return systemCntcRepository.findById(Objects.requireNonNull(cntcId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    /**
     * ?곌퀎 ?깅줉
     */
    @Transactional
    public void insertSystemCntc(SystemCntc systemCntc) {
        systemCntcRepository.save(Objects.requireNonNull(systemCntc));
    }

    /**
     * ?곌퀎 ?뱀씤
     */
    @Transactional
    public void approveSystemCntc(String cntcId) {
        SystemCntc systemCntc = selectSystemCntcDetail(Objects.requireNonNull(cntcId));
        systemCntc.approve();
    }
}
