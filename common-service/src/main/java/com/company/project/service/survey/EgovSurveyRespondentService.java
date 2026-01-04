package com.company.project.service.survey;

import com.company.project.service.survey.dto.SurveyRespondentDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 설문응답자 서비스 인터페이스
 */
public interface EgovSurveyRespondentService {

    Page<SurveyRespondentDto> getSurveyRespondentList(String qestnrId, String keyword, Pageable pageable);

    SurveyRespondentDto getSurveyRespondent(String qestnrRespondId);

    String createSurveyRespondent(String userId, SurveyRespondentDto dto);

    void updateSurveyRespondent(String qestnrRespondId, String userId, SurveyRespondentDto dto);

    void deleteSurveyRespondent(String qestnrRespondId);
}
