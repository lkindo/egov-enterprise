package com.company.project.foundation.service.system.service.survey;

import com.company.project.foundation.core.exception.BusinessException;
import com.company.project.foundation.core.exception.ErrorCode;
import com.company.project.foundation.domain.system.service.survey.SurveyRespondent;
import com.company.project.foundation.domain.system.service.survey.SurveyRespondentRepository;
import com.company.project.foundation.service.system.service.survey.dto.SurveyRespondentDto;
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
    public Page<SurveyRespondentDto> getSurveyRespondentList(String qestnrId, String keyword, Pageable pageable) {
        return surveyRespondentRepository.findByRespondNmContaining(keyword == null ? "" : keyword, pageable)
                .map(SurveyRespondentDto::from);
    }

    @Override
    public SurveyRespondentDto getSurveyRespondent(String respondentId) {
        return surveyRespondentRepository.findById(Objects.requireNonNull(respondentId))
                .map(SurveyRespondentDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String createSurveyRespondent(String userId, SurveyRespondentDto dto) {
        String id = "SRES_" + System.currentTimeMillis();
        SurveyRespondent entity = SurveyRespondent.builder()
                .qestnrRespondId(id)
                .qestnrId(dto.getQestnrId())
                .qestnrTmplatId(dto.getQestnrTmplatId())
                .sexdstnCode(dto.getSexdstnCode())
                .occpTyCode(dto.getOccpTyCode())
                .respondNm(dto.getRespondNm())
                .brthdy(dto.getBrth())
                .areaNo(dto.getAreaNo())
                .middleTelno(dto.getMiddleTelno())
                .endTelno(dto.getEndTelno())
                .createdBy(userId)
                .build();
        surveyRespondentRepository.save(Objects.requireNonNull(entity));
        return id;
    }

    @Override
    @Transactional
    public void updateSurveyRespondent(String respondentId, String userId, SurveyRespondentDto dto) {
        SurveyRespondent entity = surveyRespondentRepository.findById(Objects.requireNonNull(respondentId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getSexdstnCode(), dto.getOccpTyCode(), dto.getRespondNm(),
                dto.getBrth(), dto.getAreaNo(), dto.getMiddleTelno(), dto.getEndTelno(), dto.getRespondId());
    }

    @Override
    @Transactional
    public void deleteSurveyRespondent(String respondentId) {
        surveyRespondentRepository.deleteById(Objects.requireNonNull(respondentId));
    }
}
