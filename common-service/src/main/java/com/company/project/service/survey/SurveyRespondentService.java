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

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SurveyRespondentService implements EgovSurveyRespondentService {

    private final SurveyRespondentRepository respondentRepository;

    @Override
    public Page<SurveyRespondentDto> getRespondentList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return respondentRepository.findAll(pageable).map(SurveyRespondentDto::from);
        }
        return respondentRepository.findByRespondNmContaining(keyword, pageable).map(SurveyRespondentDto::from);
    }

    @Override
    public SurveyRespondentDto getRespondent(String respondentId) {
        return respondentRepository.findById(respondentId)
                .map(SurveyRespondentDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void insertRespondent(SurveyRespondentDto dto) {
        String id = "RESPOND_" + String.format("%013d", System.currentTimeMillis());
        respondentRepository.save(SurveyRespondent.builder()
                .qestnrRespondId(id)
                .qestnrId(dto.getQestnrId())
                .qestnrTmplatId(dto.getQestnrTmplatId())
                .sexdstnCode(dto.getSexdstnCode())
                .occpTyCode(dto.getOccpTyCode())
                .respondNm(dto.getRespondNm())
                .brth(dto.getBrth())
                .areaNo(dto.getAreaNo())
                .middleTelno(dto.getMiddleTelno())
                .endTelno(dto.getEndTelno())
                .build());
    }

    @Override
    @Transactional
    public void updateRespondent(SurveyRespondentDto dto) {
        SurveyRespondent entity = respondentRepository.findById(dto.getQestnrRespondId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getSexdstnCode(), dto.getOccpTyCode(), dto.getRespondNm(),
                dto.getBrth(), dto.getAreaNo(), dto.getMiddleTelno(), dto.getEndTelno());
    }

    @Override
    @Transactional
    public void deleteRespondent(String respondentId) {
        respondentRepository.deleteById(respondentId);
    }
}
