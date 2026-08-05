package nuri.business.service.system.service.survey;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.system.service.survey.SurveyRespondent;
import nuri.business.domain.system.service.survey.SurveyRespondentRepository;
import nuri.business.service.system.service.survey.dto.SurveyRespondentDto;
import nuri.business.service.system.service.survey.dto.SurveyRespondentMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SurveyRespondentService {

    private final SurveyRespondentRepository surveyRespondentRepository;
    private final SurveyRespondentMapper surveyRespondentMapper;

    /**
     * 설문별 응답자 목록.
     *
     * <p><b>⚠ 종전에는 {@code srvyId} 를 받고도 쓰지 않았다.</b> {@code findByRspdntNmContaining} 만
     * 호출해 <b>전체 설문의 응답자</b>를 이름으로 훑었으므로, 설문 A 의 응답자 목록에 설문 B 의
     * 응답자가 섞여 나온다. 응답자 레코드는 성별·생년월일·전화번호를 담는 개인정보라 이 혼입은
     * 단순 오조회가 아니라 <b>다른 설문 참여자의 개인정보 노출</b>이다.
     * 이미 준비돼 있던 {@code searchBySrvyIdAndKeyword} 로 교체한다.
     */
    public Page<SurveyRespondentDto> getSurveyRespondentList(String srvyId, String keyword, Pageable pageable) {
        return surveyRespondentRepository
                .searchBySrvyIdAndKeyword(Objects.requireNonNull(srvyId), keyword == null ? "" : keyword, pageable)
                .map(surveyRespondentMapper::toDto);
    }

    public SurveyRespondentDto getSurveyRespondent(String respondentId) {
        return surveyRespondentRepository.findById(Objects.requireNonNull(respondentId))
                .map(surveyRespondentMapper::toDto)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    @Transactional
    public String createSurveyRespondent(String userId, SurveyRespondentDto dto) {
        String id = nuri.foundation.core.util.IdGenerationUtil.generateId("SRES_", 13);
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

    @Transactional
    public void updateSurveyRespondent(String respondentId, String userId, SurveyRespondentDto dto) {
        SurveyRespondent entity = surveyRespondentRepository.findById(Objects.requireNonNull(respondentId))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getGndrCd(), dto.getCrTypeCd(), dto.getRspdntNm(),
                dto.getBrdt(), dto.getRgnTelno(), dto.getMidTelno(), dto.getEndTelno());
    }

    @Transactional
    public void deleteSurveyRespondent(String respondentId) {
        surveyRespondentRepository.deleteById(Objects.requireNonNull(respondentId));
    }
}
