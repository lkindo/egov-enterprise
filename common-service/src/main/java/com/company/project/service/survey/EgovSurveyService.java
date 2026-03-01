package com.company.project.service.survey;

import com.company.project.service.survey.dto.QestnrInfoDto;
import com.company.project.service.survey.dto.QestnrTmplatDto;
import com.company.project.service.survey.dto.QustnrIemDto;
import com.company.project.service.survey.dto.QustnrQesitmDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface EgovSurveyService {
    // ??—ëµ†??
    Page<QestnrTmplatDto> getTmplatList(String keyword, Pageable pageable);
    QestnrTmplatDto getTmplat(String tmplatId);
    void insertTmplat(QestnrTmplatDto dto);
    void updateTmplat(QestnrTmplatDto dto);
    void deleteTmplat(String tmplatId);

    // ??»Ð??ëº£ë‚«
    Page<QestnrInfoDto> getSurveyList(String keyword, Pageable pageable);
    QestnrInfoDto getSurvey(String qestnrId);
    void insertSurvey(QestnrInfoDto dto);
    void updateSurvey(QestnrInfoDto dto);
    void deleteSurvey(String qestnrId);

    // ??»Ð??¾ëª…ë¹?    List<QustnrQesitmDto> getQuestionList(String qestnrId);
    QustnrQesitmDto getQuestion(String qesitmId);
    void insertQuestion(QustnrQesitmDto dto);
    void updateQuestion(QustnrQesitmDto dto);
    void deleteQuestion(String qesitmId);

    // ??»Ð?????    List<QustnrIemDto> getItemList(String qesitmId);
    void insertItem(QustnrIemDto dto);
    void updateItem(QustnrIemDto dto);
    void deleteItem(String iemId);
}
