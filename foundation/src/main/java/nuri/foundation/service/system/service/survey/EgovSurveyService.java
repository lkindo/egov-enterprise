package nuri.foundation.service.system.service.survey;

import nuri.foundation.service.system.service.survey.dto.SurveyInfoDto;
import nuri.foundation.service.system.service.survey.dto.SurveyTemplateDto;
import nuri.foundation.service.system.service.survey.dto.SurveyArticleDto;
import nuri.foundation.service.system.service.survey.dto.SurveyQuestionDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface EgovSurveyService {
    // 템플릿
    Page<SurveyTemplateDto> getTmplatList(String keyword, Pageable pageable);

    SurveyTemplateDto getTmplat(String tmplatId);

    void insertTmplat(SurveyTemplateDto dto);

    void updateTmplat(SurveyTemplateDto dto);

    void deleteTmplat(String tmplatId);

    // 설문정보
    Page<SurveyInfoDto> getSurveyList(String keyword, Pageable pageable);

    SurveyInfoDto getSurvey(String srvyId);

    void insertSurvey(SurveyInfoDto dto);

    void updateSurvey(SurveyInfoDto dto);

    void deleteSurvey(String srvyId);

    // 설문문항
    List<SurveyQuestionDto> getQuestionList(String srvyId);

    SurveyQuestionDto getQuestion(String srvyQstnId);

    void insertQuestion(SurveyQuestionDto dto);

    void updateQuestion(SurveyQuestionDto dto);

    void deleteQuestion(String srvyQstnId);

    // 설문항목
    List<SurveyArticleDto> getItemList(String srvyQstnId);

    void insertItem(SurveyArticleDto dto);

    void updateItem(SurveyArticleDto dto);

    void deleteItem(String srvyArtclId);
}
