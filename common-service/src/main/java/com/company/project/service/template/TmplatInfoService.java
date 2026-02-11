package com.company.project.service.template;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.template.TmplatInfo;
import com.company.project.domain.template.TmplatInfoRepository;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 템플릿 관리 서비스
 */
@Service("egovTmplatInfoService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TmplatInfoService extends EgovAbstractServiceImpl {

    private final TmplatInfoRepository tmplatInfoRepository;

    public List<TmplatInfo> selectTmplatInfoList() {
        return tmplatInfoRepository.findAll();
    }

    public List<TmplatInfo> selectTmplatInfoListByType(String seCode) {
        return tmplatInfoRepository.findByTmplatSeCode(seCode);
    }

    public TmplatInfo selectTmplatInfoDetail(String tmplatId) {
        return tmplatInfoRepository.findById(tmplatId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Transactional
    public void insertTmplatInfo(TmplatInfo tmplatInfo) {
        tmplatInfoRepository.save(tmplatInfo);
    }

    @Transactional
    public void deleteTmplatInfo(String tmplatId) {
        tmplatInfoRepository.deleteById(tmplatId);
    }
}
