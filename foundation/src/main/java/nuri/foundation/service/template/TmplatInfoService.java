package nuri.foundation.service.template;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.foundation.core.service.BaseAbstractService;
import nuri.foundation.domain.template.TmplatInfo;
import nuri.foundation.domain.template.TmplatInfoRepository;

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
