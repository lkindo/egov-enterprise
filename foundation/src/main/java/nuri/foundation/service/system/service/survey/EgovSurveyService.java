package nuri.foundation.service.system.service.survey;

import nuri.foundation.service.system.service.survey.dto.QestnrInfoDto;
import nuri.foundation.service.system.service.survey.dto.QestnrTmplatDto;
import nuri.foundation.service.system.service.survey.dto.QustnrIemDto;
import nuri.foundation.service.system.service.survey.dto.QustnrQesitmDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface EgovSurveyService {
    // 템플릿
    Page<QestnrTmplatDto> getTmplatList(String keyword, Pageable pageable);

    QestnrTmplatDto getTmplat(String tmplatId);

    void insertTmplat(QestnrTmplatDto dto);

    void updateTmplat(QestnrTmplatDto dto);

    void deleteTmplat(String tmplatId);

    // 설문정보
    Page<QestnrInfoDto> getSurveyList(String keyword, Pageable pageable);

    QestnrInfoDto getSurvey(String qestnrId);

    void insertSurvey(QestnrInfoDto dto);

    void updateSurvey(QestnrInfoDto dto);

    void deleteSurvey(String qestnrId);

    // 설문문항
    List<QustnrQesitmDto> getQuestionList(String qestnrId);

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
