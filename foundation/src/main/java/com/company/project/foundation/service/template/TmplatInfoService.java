package com.company.project.foundation.service.template;

import com.company.project.foundation.core.exception.BusinessException;
import com.company.project.foundation.core.exception.ErrorCode;
import com.company.project.foundation.core.service.BaseAbstractService;
import com.company.project.foundation.domain.template.TmplatInfo;
import com.company.project.foundation.domain.template.TmplatInfoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

/**
 * 템플릿 정보 서비스
 */
@Service("egovTmplatInfoService")
@Transactional(readOnly = true)
public class TmplatInfoService extends BaseAbstractService {

    private final TmplatInfoRepository tmplatInfoRepository;

    public TmplatInfoService(TmplatInfoRepository tmplatInfoRepository) {
        this.tmplatInfoRepository = required(tmplatInfoRepository, "TmplatInfoRepository 는 null 일 수 없습니다");
    }

    public List<TmplatInfo> selectTmplatInfoList() {
        return tmplatInfoRepository.findAll();
    }

    public List<TmplatInfo> selectTmplatInfoListByType(String seCode) {
        return tmplatInfoRepository.findByTmplatSeCode(seCode);
    }

    public TmplatInfo selectTmplatInfoDetail(String tmplatId) {
        return tmplatInfoRepository.findById(required(tmplatId, "템플릿 ID 는 null 일 수 없습니다"))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Transactional
    public void insertTmplatInfo(TmplatInfo tmplatInfo) {
        tmplatInfoRepository.save(required(tmplatInfo, "템플릿 정보는 null 일 수 없습니다"));
    }

    @Transactional
    public void deleteTmplatInfo(String tmplatId) {
        tmplatInfoRepository.deleteById(required(tmplatId, "템플릿 ID 는 null 일 수 없습니다"));
    }
}
