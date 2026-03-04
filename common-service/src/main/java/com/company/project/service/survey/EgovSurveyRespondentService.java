package com.company.project.service.survey;

import com.company.project.service.survey.dto.SurveyRespondentDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * ???묐떟????퉬???명꽣??씠??
 */
public interface EgovSurveyRespondentService {

    Page<SurveyRespondentDto> getSurveyRespondentList(String qestnrId, String keyword, Pageable pageable);

    SurveyRespondentDto getSurveyRespondent(String qestnrRespondId);

    String createSurveyRespondent(String userId, SurveyRespondentDto dto);

    void updateSurveyRespondent(String qestnrRespondId, String userId, SurveyRespondentDto dto);

    void deleteSurveyRespondent(String qestnrRespondId);
}