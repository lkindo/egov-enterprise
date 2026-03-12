package com.company.project.service.system.service.survey;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.system.service.survey.*;
import com.company.project.service.system.service.survey.dto.QestnrInfoDto;
import com.company.project.service.system.service.survey.dto.QestnrTmplatDto;
import com.company.project.service.system.service.survey.dto.QustnrIemDto;
import com.company.project.service.system.service.survey.dto.QustnrQesitmDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("SurveyService 테스트")
class SurveyServiceTest {

    @Mock
    private QestnrTmplatRepository tmplatRepository;
    @Mock
    private QestnrInfoRepository infoRepository;
    @Mock
    private QustnrQesitmRepository qesitmRepository;
    @Mock
    private QustnrIemRepository iemRepository;

    @InjectMocks
    private SurveyService surveyService;

    // --- Template Tests ---

    @Test
    @DisplayName("설문 템플릿 목록 조회 - 키워드 없음")
    void getTmplatList_NoKeyword() {
        given(tmplatRepository.findAll(any(Pageable.class))).willReturn(new PageImpl<>(List.of(new QestnrTmplat())));
        Page<QestnrTmplatDto> result = surveyService.getTmplatList(null, Pageable.unpaged());
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("설문 템플릿 목록 조회 - 키워드 포함")
    void getTmplatList_WithKeyword() {
        given(tmplatRepository.findByQestnrTmplatTyContaining(anyString(), any(Pageable.class)))
                .willReturn(new PageImpl<>(List.of(new QestnrTmplat())));
        Page<QestnrTmplatDto> result = surveyService.getTmplatList("ty", Pageable.unpaged());
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("설문 템플릿 상세 조회 성공")
    void getTmplat_Success() {
        QestnrTmplat tmplat = QestnrTmplat.builder().qestnrTmplatId("ID").build();
        given(tmplatRepository.findById("ID")).willReturn(Optional.of(tmplat));
        QestnrTmplatDto result = surveyService.getTmplat("ID");
        assertThat(result.getQestnrTmplatId()).isEqualTo("ID");
    }

    @Test
    @DisplayName("설문 템플릿 상세 조회 실패 - 존재하지 않음")
    void getTmplat_NotFound() {
        given(tmplatRepository.findById(anyString())).willReturn(Optional.empty());
        assertThatThrownBy(() -> surveyService.getTmplat("ID"))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.RESOURCE_NOT_FOUND);
    }

    @Test
    @DisplayName("설문 템플릿 등록 성공")
    void insertTmplat_Success() {
        QestnrTmplatDto dto = QestnrTmplatDto.builder().qestnrTmplatTy("Type").build();
        surveyService.insertTmplat(dto);
        verify(tmplatRepository).save(any(QestnrTmplat.class));
    }

    @Test
    @DisplayName("설문 템플릿 수정 성공")
    void updateTmplat_Success() {
        QestnrTmplat tmplat = QestnrTmplat.builder().qestnrTmplatId("ID").build();
        given(tmplatRepository.findById("ID")).willReturn(Optional.of(tmplat));
        QestnrTmplatDto dto = QestnrTmplatDto.builder().qestnrTmplatId("ID").qestnrTmplatTy("New").build();
        surveyService.updateTmplat(dto);
        assertThat(tmplat.getQestnrTmplatTy()).isEqualTo("New");
    }

    @Test
    @DisplayName("설문 템플릿 삭제 성공")
    void deleteTmplat_Success() {
        surveyService.deleteTmplat("ID");
        verify(tmplatRepository).deleteById("ID");
    }

    // --- Survey Info Tests ---

    @Test
    @DisplayName("설문 정보 목록 조회 - 키워드 없음")
    void getSurveyList_NoKeyword() {
        given(infoRepository.findAll(any(Pageable.class))).willReturn(new PageImpl<>(List.of(new QestnrInfo())));
        Page<QestnrInfoDto> result = surveyService.getSurveyList(null, Pageable.unpaged());
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("설문 정보 목록 조회 - 키워드 포함")
    void getSurveyList_WithKeyword() {
        given(infoRepository.findByQestnrSjContaining(anyString(), any(Pageable.class)))
                .willReturn(new PageImpl<>(List.of(new QestnrInfo())));
        Page<QestnrInfoDto> result = surveyService.getSurveyList("sj", Pageable.unpaged());
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("설문 정보 상세 조회")
    void getSurvey_Success() {
        QestnrInfo info = QestnrInfo.builder().qestnrId("ID").build();
        given(infoRepository.findById("ID")).willReturn(Optional.of(info));
        QestnrInfoDto result = surveyService.getSurvey("ID");
        assertThat(result.getQestnrId()).isEqualTo("ID");
    }

    @Test
    @DisplayName("설문 정보 등록")
    void insertSurvey_Success() {
        QestnrInfoDto dto = QestnrInfoDto.builder().qestnrSj("Subject").build();
        surveyService.insertSurvey(dto);
        verify(infoRepository).save(any(QestnrInfo.class));
    }

    @Test
    @DisplayName("설문 정보 수정")
    void updateSurvey_Success() {
        QestnrInfo info = QestnrInfo.builder().qestnrId("ID").build();
        given(infoRepository.findById("ID")).willReturn(Optional.of(info));
        QestnrInfoDto dto = QestnrInfoDto.builder().qestnrId("ID").qestnrSj("New Subject").build();
        surveyService.updateSurvey(dto);
        assertThat(info.getQestnrSj()).isEqualTo("New Subject");
    }

    @Test
    @DisplayName("설문 정보 삭제")
    void deleteSurvey_Success() {
        surveyService.deleteSurvey("ID");
        verify(infoRepository).deleteById("ID");
    }

    // --- Question Tests ---

    @Test
    @DisplayName("문항 목록 조회 - 아이템 포함")
    void getQuestionList_WithItems() {
        QustnrQesitm question = QustnrQesitm.builder().qestnrQesitmId("Q_ID").build();
        QustnrIem item = QustnrIem.builder().qustnrIemId("I_ID").build();
        
        given(qesitmRepository.findByQestnrIdOrderByQestnSnAsc("S_ID")).willReturn(List.of(question));
        given(iemRepository.findByQestnrQesitmIdOrderByIemSnAsc("Q_ID")).willReturn(List.of(item));

        List<QustnrQesitmDto> result = surveyService.getQuestionList("S_ID");
        
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getItems()).hasSize(1);
    }

    @Test
    @DisplayName("문항 상세 조회")
    void getQuestion_Success() {
        QustnrQesitm question = QustnrQesitm.builder().qestnrQesitmId("Q_ID").build();
        given(qesitmRepository.findById("Q_ID")).willReturn(Optional.of(question));
        QustnrQesitmDto result = surveyService.getQuestion("Q_ID");
        assertThat(result.getQestnrQesitmId()).isEqualTo("Q_ID");
    }

    @Test
    @DisplayName("문항 등록")
    void insertQuestion_Success() {
        QustnrQesitmDto dto = QustnrQesitmDto.builder().qestnCn("Content").build();
        surveyService.insertQuestion(dto);
        verify(qesitmRepository).save(any(QustnrQesitm.class));
    }

    @Test
    @DisplayName("문항 수정")
    void updateQuestion_Success() {
        QustnrQesitm question = QustnrQesitm.builder().qestnrQesitmId("Q_ID").build();
        given(qesitmRepository.findById("Q_ID")).willReturn(Optional.of(question));
        QustnrQesitmDto dto = QustnrQesitmDto.builder().qestnrQesitmId("Q_ID").qestnCn("New Content").build();
        surveyService.updateQuestion(dto);
        assertThat(question.getQestnCn()).isEqualTo("New Content");
    }

    @Test
    @DisplayName("문항 삭제")
    void deleteQuestion_Success() {
        surveyService.deleteQuestion("Q_ID");
        verify(qesitmRepository).deleteById("Q_ID");
    }

    // --- Item Tests ---

    @Test
    @DisplayName("항목 목록 조회")
    void getItemList_Success() {
        given(iemRepository.findByQestnrQesitmIdOrderByIemSnAsc("Q_ID")).willReturn(Collections.emptyList());
        List<QustnrIemDto> result = surveyService.getItemList("Q_ID");
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("항목 등록")
    void insertItem_Success() {
        QustnrIemDto dto = QustnrIemDto.builder().iemCn("Item").build();
        surveyService.insertItem(dto);
        verify(iemRepository).save(any(QustnrIem.class));
    }

    @Test
    @DisplayName("항목 수정")
    void updateItem_Success() {
        QustnrIem item = QustnrIem.builder().qustnrIemId("I_ID").build();
        given(iemRepository.findById("I_ID")).willReturn(Optional.of(item));
        QustnrIemDto dto = QustnrIemDto.builder().qustnrIemId("I_ID").iemCn("New Item").build();
        surveyService.updateItem(dto);
        assertThat(item.getIemCn()).isEqualTo("New Item");
    }

    @Test
    @DisplayName("항목 삭제")
    void deleteItem_Success() {
        surveyService.deleteItem("I_ID");
        verify(iemRepository).deleteById("I_ID");
    }
}
