package nuri.business.service.system.service.survey;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.business.domain.system.service.survey.SurveyRespondent;
import nuri.business.domain.system.service.survey.SurveyRespondentRepository;
import nuri.business.service.system.service.survey.dto.SurveyRespondentDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SurveyRespondentService implements EgovSurveyRespondentService {

    private final SurveyRespondentRepository surveyRespondentRepository;

    @Override
    public Page<SurveyRespondentDto> getSurveyRespondentList(String srvyId, String keyword, Pageable pageable) {
        return surveyRespondentRepository.findByRspdntNmContaining(keyword == null ? "" : keyword, pageable)
                .map(SurveyRespondentDto::from);
    }

    @Override
    public SurveyRespondentDto getSurveyRespondent(String respondentId) {
        return surveyRespondentRepository.findById(Objects.requireNonNull(respondentId))
                .map(SurveyRespondentDto::from)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String createSurveyRespondent(String userId, SurveyRespondentDto dto) {
        String id = "SRES_" + System.currentTimeMillis();
        SurveyRespondent entity = SurveyRespondent.builder()
                .srvyRspdntId(id)
                .srvyId(dto.getSrvyId())
                .srvyTmpltId(dto.getSrvyTmpltId())
                .gndrCd(dto.getGndrCd())
                .crTypeCd(dto.getCrTypeCd())
                .rspdntNm(dto.getRspdntNm())
                .brdt(dto.getBrdt())
                .rgnTelno(dto.getRgnTelno())
                .midTelno(dto.getMidTelno())
                .endTelno(dto.getEndTelno())
                .build();
        // frstRgtrId 는 표준 Auditing(@CreatedBy)이 설정하므로 빌더에서 제외
        surveyRespondentRepository.save(Objects.requireNonNull(entity));
        return id;
    }

    @Override
    @Transactional
    public void updateSurveyRespondent(String respondentId, String userId, SurveyRespondentDto dto) {
        SurveyRespondent entity = surveyRespondentRepository.findById(Objects.requireNonNull(respondentId))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getGndrCd(), dto.getCrTypeCd(), dto.getRspdntNm(),
                dto.getBrdt(), dto.getRgnTelno(), dto.getMidTelno(), dto.getEndTelno());
    }

    @Override
    @Transactional
    public void deleteSurveyRespondent(String respondentId) {
        surveyRespondentRepository.deleteById(Objects.requireNonNull(respondentId));
    }
}
