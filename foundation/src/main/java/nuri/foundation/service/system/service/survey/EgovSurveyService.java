package nuri.foundation.service.system.service.survey;

import nuri.foundation.service.system.service.survey.dto.QustnrInfoDto;
import nuri.foundation.service.system.service.survey.dto.QustnrTmplatDto;
import nuri.foundation.service.system.service.survey.dto.QustnrIemDto;
import nuri.foundation.service.system.service.survey.dto.QustnrQesitmDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface EgovSurveyService {
    // 템플릿
    Page<QustnrTmplatDto> getTmplatList(String keyword, Pageable pageable);

    QustnrTmplatDto getTmplat(String tmplatId);

    void insertTmplat(QustnrTmplatDto dto);

    void updateTmplat(QustnrTmplatDto dto);

    void deleteTmplat(String tmplatId);

    // 설문정보
    Page<QustnrInfoDto> getSurveyList(String keyword, Pageable pageable);

    QustnrInfoDto getSurvey(String qustnrId);

    void insertSurvey(QustnrInfoDto dto);

    void updateSurvey(QustnrInfoDto dto);

    void deleteSurvey(String qustnrId);

    // 설문문항
    List<QustnrQesitmDto> getQuestionList(String qustnrId);

    QustnrQesitmDto getQuestion(String qesitmId);

    void insertQuestion(QustnrQesitmDto dto);

    void updateQuestion(QustnrQesitmDto dto);

    void deleteQuestion(String qesitmId);

    // 설문항목
    List<QustnrIemDto> getItemList(String qesitmId);

    void insertItem(QustnrIemDto dto);

    void updateItem(QustnrIemDto dto);

    void deleteItem(String iemId);
}
