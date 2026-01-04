package com.company.project.service.survey;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.survey.SurveyRespondent;
import com.company.project.domain.survey.SurveyRespondentRepository;
import com.company.project.service.survey.dto.SurveyRespondentDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 설문응답자 서비스 구현체
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SurveyRespondentService implements EgovSurveyRespondentService {

    private final SurveyRespondentRepository surveyRespondentRepository;

    @Override
    public Page<SurveyRespondentDto> getSurveyRespondentList(String qestnrId, String keyword, Pageable pageable) {
        if (qestnrId != null && !qestnrId.isEmpty()) {
            if (keyword != null && !keyword.isEmpty()) {
                return surveyRespondentRepository.searchByQestnrIdAndKeyword(qestnrId, keyword, pageable)
                        .map(SurveyRespondentDto::from);
            }
            return surveyRespondentRepository.findByQestnrId(qestnrId, pageable)
                    .map(SurveyRespondentDto::from);
        }
        return surveyRespondentRepository.findAll(pageable).map(SurveyRespondentDto::from);
    }

    @Override
    public SurveyRespondentDto getSurveyRespondent(String qestnrRespondId) {
        SurveyRespondent respondent = surveyRespondentRepository.findById(qestnrRespondId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return SurveyRespondentDto.from(respondent);
    }

    @Override
    @Transactional
    public String createSurveyRespondent(String userId, SurveyRespondentDto dto) {
        String qestnrRespondId = "RESP_" + String.format("%013d", System.currentTimeMillis());

        SurveyRespondent respondent = SurveyRespondent.builder()
                .qestnrRespondId(qestnrRespondId)
                .qestnrId(dto.getQestnrId())
                .qestnrTmplatId(dto.getQestnrTmplatId())
                .sexdstnCode(dto.getSexdstnCode())
                .occpTyCode(dto.getOccpTyCode())
                .respondNm(dto.getRespondNm())
                .brth(dto.getBrth())
                .areaNo(dto.getAreaNo())
                .middleTelno(dto.getMiddleTelno())
                .endTelno(dto.getEndTelno())
                .frstRegisterId(userId)
                .build();

        surveyRespondentRepository.save(respondent);
        return qestnrRespondId;
    }

    @Override
    @Transactional
    public void updateSurveyRespondent(String qestnrRespondId, String userId, SurveyRespondentDto dto) {
        SurveyRespondent respondent = surveyRespondentRepository.findById(qestnrRespondId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        respondent.update(dto.getSexdstnCode(), dto.getOccpTyCode(), dto.getRespondNm(),
                dto.getBrth(), dto.getAreaNo(), dto.getMiddleTelno(), dto.getEndTelno(), userId);
    }

    @Override
    @Transactional
    public void deleteSurveyRespondent(String qestnrRespondId) {
        SurveyRespondent respondent = surveyRespondentRepository.findById(qestnrRespondId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        surveyRespondentRepository.delete(respondent);
    }
}
