package nuri.foundation.service.system.service.survey;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.domain.system.service.survey.*;
import nuri.foundation.service.system.service.survey.dto.QestnrInfoDto;
import nuri.foundation.service.system.service.survey.dto.QestnrTmplatDto;
import nuri.foundation.service.system.service.survey.dto.QustnrIemDto;
import nuri.foundation.service.system.service.survey.dto.QustnrQesitmDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
@DisplayName("SurveyService 단위 테스트")
class SurveyServiceTest {

    @InjectMocks
    private SurveyService surveyService;

    @Mock
    private QestnrTmplatRepository tmplatRepository;
    @Mock
    private QestnrInfoRepository infoRepository;
    @Mock
    private QustnrQesitmRepository qesitmRepository;
    @Mock
    private QustnrIemRepository iemRepository;

    @Test
    @DisplayName("설문 템플릿 목록 조회 - 키워드 없음")
    void getTmplatList_NoKeyword() {
        Pageable pageable = PageRequest.of(0, 10);
        QestnrTmplat tmplat = QestnrTmplat.builder().qestnrTmplatId("T1").qestnrTmplatTy("Type1").build();
        given(tmplatRepository.findAll(pageable)).willReturn(new PageImpl<>(List.of(tmplat)));

        Page<QestnrTmplatDto> result = surveyService.getTmplatList(null, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getQestnrTmplatId()).isEqualTo("T1");
    }

    @Test
    @DisplayName("설문 템플릿 목록 조회 - 키워드 있음")
    void getTmplatList_WithKeyword() {
        Pageable pageable = PageRequest.of(0, 10);
        QestnrTmplat tmplat = QestnrTmplat.builder().qestnrTmplatId("T1").qestnrTmplatTy("Type1").build();
        given(tmplatRepository.findByQestnrTmplatTyContaining(eq("Keyword"), any())).willReturn(new PageImpl<>(List.of(tmplat)));

        Page<QestnrTmplatDto> result = surveyService.getTmplatList("Keyword", pageable);

        assertThat(result.getContent()).hasSize(1);
        verify(tmplatRepository).findByQestnrTmplatTyContaining(eq("Keyword"), any());
    }

    @Test
    @DisplayName("설문 템플릿 목록 조회 - 빈 키워드")
    void getTmplatList_EmptyKeyword() {
        Pageable pageable = PageRequest.of(0, 10);
        QestnrTmplat tmplat = QestnrTmplat.builder().qestnrTmplatId("T1").build();
        given(tmplatRepository.findAll(pageable)).willReturn(new PageImpl<>(List.of(tmplat)));

        Page<QestnrTmplatDto> result = surveyService.getTmplatList("", pageable);

        assertThat(result.getContent()).hasSize(1);
        verify(tmplatRepository).findAll(pageable);
    }

    @Test
    @DisplayName("설문 템플릿 상세 조회 - 성공")
    void getTmplat_Success() {
        QestnrTmplat tmplat = QestnrTmplat.builder().qestnrTmplatId("T1").build();
        given(tmplatRepository.findById("T1")).willReturn(Optional.of(tmplat));

        QestnrTmplatDto result = surveyService.getTmplat("T1");

        assertThat(result.getQestnrTmplatId()).isEqualTo("T1");
    }

    @Test
    @DisplayName("설문 템플릿 상세 조회 - 실패")
    void getTmplat_Fail() {
        given(tmplatRepository.findById("T99")).willReturn(Optional.empty());
        assertThrows(BusinessException.class, () -> surveyService.getTmplat("T99"));
    }

    @Test
    @DisplayName("설문 템플릿 등록")
    void insertTmplat() {
        QestnrTmplatDto dto = QestnrTmplatDto.builder().qestnrTmplatTy("New").build();
        surveyService.insertTmplat(dto);
        verify(tmplatRepository, times(1)).save(any(QestnrTmplat.class));
    }

    @Test
    @DisplayName("설문 템플릿 수정 - 성공")
    void updateTmplat_Success() {
        QestnrTmplat tmplat = QestnrTmplat.builder().qestnrTmplatId("T1").qestnrTmplatTy("Old").build();
        given(tmplatRepository.findById("T1")).willReturn(Optional.of(tmplat));

        QestnrTmplatDto dto = QestnrTmplatDto.builder().qestnrTmplatId("T1").qestnrTmplatTy("New").build();
        surveyService.updateTmplat(dto);

        assertThat(tmplat.getQestnrTmplatTy()).isEqualTo("New");
    }

    @Test
    @DisplayName("설문 템플릿 수정 - 실패 (데이터 없음)")
    void updateTmplat_Fail() {
        given(tmplatRepository.findById("T99")).willReturn(Optional.empty());
        QestnrTmplatDto dto = QestnrTmplatDto.builder().qestnrTmplatId("T99").build();
        assertThrows(BusinessException.class, () -> surveyService.updateTmplat(dto));
    }

    @Test
    @DisplayName("설문 템플릿 삭제")
    void deleteTmplat() {
        surveyService.deleteTmplat("T1");
        verify(tmplatRepository, times(1)).deleteById("T1");
    }

    @Test
    @DisplayName("설문 정보 목록 조회 - 키워드 없음")
    void getSurveyList_NoKeyword() {
        Pageable pageable = PageRequest.of(0, 10);
        QestnrInfo info = QestnrInfo.builder().qestnrId("S1").qestnrSj("Subject").build();
        given(infoRepository.findAll(pageable)).willReturn(new PageImpl<>(List.of(info)));

        Page<QestnrInfoDto> result = surveyService.getSurveyList(null, pageable);

        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("설문 정보 목록 조회 - 키워드 있음")
    void getSurveyList_WithKeyword() {
        Pageable pageable = PageRequest.of(0, 10);
        QestnrInfo info = QestnrInfo.builder().qestnrId("S1").qestnrSj("Subject").build();
        given(infoRepository.findByQestnrSjContaining(eq("Subject"), any())).willReturn(new PageImpl<>(List.of(info)));

        Page<QestnrInfoDto> result = surveyService.getSurveyList("Subject", pageable);

        assertThat(result.getContent()).hasSize(1);
        verify(infoRepository).findByQestnrSjContaining(eq("Subject"), any());
    }

    @Test
    @DisplayName("설문 정보 목록 조회 - 빈 키워드")
    void getSurveyList_EmptyKeyword() {
        Pageable pageable = PageRequest.of(0, 10);
        QestnrInfo info = QestnrInfo.builder().qestnrId("S1").build();
        given(infoRepository.findAll(pageable)).willReturn(new PageImpl<>(List.of(info)));

        Page<QestnrInfoDto> result = surveyService.getSurveyList("", pageable);

        assertThat(result.getContent()).hasSize(1);
        verify(infoRepository).findAll(pageable);
    }

    @Test
    @DisplayName("설문 정보 상세 조회")
    void getSurvey() {
        QestnrInfo info = QestnrInfo.builder().qestnrId("S1").build();
        given(infoRepository.findById("S1")).willReturn(Optional.of(info));

        QestnrInfoDto result = surveyService.getSurvey("S1");

        assertThat(result.getQestnrId()).isEqualTo("S1");
    }

    @Test
    @DisplayName("설문 정보 등록 - 성공")
    void insertSurvey_Success() {
        QestnrInfoDto dto = QestnrInfoDto.builder()
                .qestnrSj("Subject")
                .qestnrBeginDe("2024-01-01")
                .qestnrEndDe("2024-01-31")
                .build();
        surveyService.insertSurvey(dto);
        verify(infoRepository, times(1)).save(any(QestnrInfo.class));
    }

    @Test
    @DisplayName("설문 정보 등록 - 실패 (날짜 역전)")
    void insertSurvey_Fail_DateReverse() {
        QestnrInfoDto dto = QestnrInfoDto.builder()
                .qestnrSj("Subject")
                .qestnrBeginDe("2024-01-31")
                .qestnrEndDe("2024-01-01")
                .build();
        assertThrows(BusinessException.class, () -> surveyService.insertSurvey(dto));
    }

    @Test
    @DisplayName("설문 정보 등록 - 날짜 일부 누락 (Null 체크 브랜치)")
    void insertSurvey_PartialDates() {
        // Case 1: beginDe is null
        QestnrInfoDto dto1 = QestnrInfoDto.builder().qestnrEndDe("2024-01-01").build();
        surveyService.insertSurvey(dto1);
        
        // Case 2: endDe is null
        QestnrInfoDto dto2 = QestnrInfoDto.builder().qestnrBeginDe("2024-01-01").build();
        surveyService.insertSurvey(dto2);
        
        verify(infoRepository, times(2)).save(any()); 
    }

    @Test
    @DisplayName("설문 정보 수정 - 성공")
    void updateSurvey_Success() {
        QestnrInfo info = QestnrInfo.builder().qestnrId("S1").qestnrSj("Old").build();
        given(infoRepository.findById("S1")).willReturn(Optional.of(info));

        QestnrInfoDto dto = QestnrInfoDto.builder().qestnrId("S1").qestnrSj("New").build();
        surveyService.updateSurvey(dto);

        assertThat(info.getQestnrSj()).isEqualTo("New");
    }

    @Test
    @DisplayName("설문 정보 수정 - 실패 (데이터 없음)")
    void updateSurvey_Fail() {
        given(infoRepository.findById("S99")).willReturn(Optional.empty());
        QestnrInfoDto dto = QestnrInfoDto.builder().qestnrId("S99").build();
        assertThrows(BusinessException.class, () -> surveyService.updateSurvey(dto));
    }

    @Test
    @DisplayName("설문 정보 삭제")
    void deleteSurvey() {
        surveyService.deleteSurvey("S1");
        verify(infoRepository, times(1)).deleteById("S1");
    }

    @Test
    @DisplayName("설문 문항 목록 조회")
    void getQuestionList() {
        QustnrQesitm question = QustnrQesitm.builder().qestnrQesitmId("Q1").qestnrId("S1").qestnSn(1L).build();
        given(qesitmRepository.findByQestnrIdOrderByQestnSnAsc("S1")).willReturn(List.of(question));
        
        QustnrIem item = QustnrIem.builder().qustnrIemId("I1").qestnrQesitmId("Q1").iemSn(1L).build();
        given(iemRepository.findByQestnrQesitmIdOrderByIemSnAsc("Q1")).willReturn(List.of(item));

        List<QustnrQesitmDto> result = surveyService.getQuestionList("S1");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getQestnrQesitmId()).isEqualTo("Q1");
        assertThat(result.get(0).getItems()).hasSize(1);
    }

    @Test
    @DisplayName("설문 문항 상세 조회")
    void getQuestion() {
        QustnrQesitm question = QustnrQesitm.builder().qestnrQesitmId("Q1").build();
        given(qesitmRepository.findById("Q1")).willReturn(Optional.of(question));

        QustnrQesitmDto result = surveyService.getQuestion("Q1");

        assertThat(result.getQestnrQesitmId()).isEqualTo("Q1");
    }

    @Test
    @DisplayName("설문 문항 등록")
    void insertQuestion() {
        QustnrQesitmDto dto = QustnrQesitmDto.builder().qestnCn("Question").build();
        surveyService.insertQuestion(dto);
        verify(qesitmRepository, times(1)).save(any(QustnrQesitm.class));
    }

    @Test
    @DisplayName("설문 문항 수정 - 성공")
    void updateQuestion_Success() {
        QustnrQesitm question = QustnrQesitm.builder().qestnrQesitmId("Q1").qestnCn("Old").build();
        given(qesitmRepository.findById("Q1")).willReturn(Optional.of(question));

        QustnrQesitmDto dto = QustnrQesitmDto.builder().qestnrQesitmId("Q1").qestnCn("New").build();
        surveyService.updateQuestion(dto);

        assertThat(question.getQestnCn()).isEqualTo("New");
    }

    @Test
    @DisplayName("설문 문항 수정 - 실패 (데이터 없음)")
    void updateQuestion_Fail() {
        given(qesitmRepository.findById("Q99")).willReturn(Optional.empty());
        QustnrQesitmDto dto = QustnrQesitmDto.builder().qestnrQesitmId("Q99").build();
        assertThrows(BusinessException.class, () -> surveyService.updateQuestion(dto));
    }

    @Test
    @DisplayName("설문 문항 삭제")
    void deleteQuestion() {
        surveyService.deleteQuestion("Q1");
        verify(qesitmRepository, times(1)).deleteById("Q1");
    }

    @Test
    @DisplayName("설문 항목 등록")
    void insertItem() {
        QustnrIemDto dto = QustnrIemDto.builder().iemCn("Item").build();
        surveyService.insertItem(dto);
        verify(iemRepository, times(1)).save(any(QustnrIem.class));
    }

    @Test
    @DisplayName("설문 항목 수정 - 성공")
    void updateItem_Success() {
        QustnrIem item = QustnrIem.builder().qustnrIemId("I1").iemCn("Old").build();
        given(iemRepository.findById("I1")).willReturn(Optional.of(item));

        QustnrIemDto dto = QustnrIemDto.builder().qustnrIemId("I1").iemCn("New").build();
        surveyService.updateItem(dto);

        assertThat(item.getIemCn()).isEqualTo("New");
    }

    @Test
    @DisplayName("설문 항목 수정 - 실패 (데이터 없음)")
    void updateItem_Fail() {
        given(iemRepository.findById("I99")).willReturn(Optional.empty());
        QustnrIemDto dto = QustnrIemDto.builder().qustnrIemId("I99").build();
        assertThrows(BusinessException.class, () -> surveyService.updateItem(dto));
    }

    @Test
    @DisplayName("설문 항목 삭제")
    void deleteItem() {
        surveyService.deleteItem("I1");
        verify(iemRepository, times(1)).deleteById("I1");
    }
}
