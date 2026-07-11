package nuri.business.service.system.service.survey;

import nuri.business.service.system.service.survey.dto.SurveyRespondentDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 설문응답자 서비스 인터페이스
 */
public interface EgovSurveyRespondentService {

    Page<SurveyRespondentDto> getSurveyRespondentList(String srvyId, String keyword, Pageable pageable);

    SurveyRespondentDto getSurveyRespondent(String srvyRspdId);

    String createSurveyRespondent(String userId, SurveyRespondentDto dto);

    void updateSurveyRespondent(String srvyRspdId, String userId, SurveyRespondentDto dto);

    void deleteSurveyRespondent(String srvyRspdId);
}
