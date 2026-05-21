package nuri.foundation.service.system.service.survey;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.domain.system.service.survey.*;
import nuri.foundation.service.system.service.survey.dto.QustnrIemDto;
import nuri.foundation.service.system.service.survey.dto.QustnrInfoDto;
import nuri.foundation.service.system.service.survey.dto.QustnrQesitmDto;
import nuri.foundation.service.system.service.survey.dto.QustnrTmplatDto;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
@DisplayName("SurveyService 단위 테스트 (Full Coverage)")
class SurveyServiceTest {

    @InjectMocks
    private SurveyService surveyService;

    @Mock
    private QustnrTmplatRepository tmplatRepository;
    @Mock
    private QustnrInfoRepository infoRepository;
    @Mock
    private QustnrQesitmRepository qesitmRepository;
    @Mock
    private QustnrIemRepository iemRepository;

    // ==========================================
    // 1. 설문 템플릿 테스트
    // ==========================================

    @Test
    @DisplayName("설문 템플릿 목록 조회 - 키워드 없음")
    void getTmplatList_NoKeyword() {
        Pageable pageable = PageRequest.of(0, 10);
        QustnrTmplat tmplat = QustnrTmplat.builder().srvyTmplatId("T1").srvyTmplatTypeCd("Type1").build();
        given(tmplatRepository.findAll(pageable)).willReturn(new PageImpl<>(List.of(tmplat)));

        Page<QustnrTmplatDto> result = surveyService.getTmplatList(null, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getSrvyTmplatId()).isEqualTo("T1");
    }

    @Test
    @DisplayName("설문 템플릿 목록 조회 - 키워드 있음")
    void getTmplatList_WithKeyword() {
        Pageable pageable = PageRequest.of(0, 10);
        QustnrTmplat tmplat = QustnrTmplat.builder().srvyTmplatId("T1").srvyTmplatTypeCd("Type1").build();
        given(tmplatRepository.findBySrvyTmplatTypeCdContaining(eq("Keyword"), any())).willReturn(new PageImpl<>(List.of(tmplat)));

        Page<QustnrTmplatDto> result = surveyService.getTmplatList("Keyword", pageable);

        assertThat(result.getContent()).hasSize(1);
        verify(tmplatRepository).findBySrvyTmplatTypeCdContaining(eq("Keyword"), any());
    }

    @Test
    @DisplayName("설문 템플릿 상세 조회 - 성공")
    void getTmplat_Success() {
        QustnrTmplat tmplat = QustnrTmplat.builder().srvyTmplatId("T1").build();
        given(tmplatRepository.findById("T1")).willReturn(Optional.of(tmplat));

        QustnrTmplatDto result = surveyService.getTmplat("T1");

        assertThat(result.getSrvyTmplatId()).isEqualTo("T1");
    }

    @Test
    @DisplayName("설문 템플릿 상세 조회 - 자원 없음 예외")
    void getTmplat_NotFound_ShouldThrowBusinessException() {
        given(tmplatRepository.findById("T1")).willReturn(Optional.empty());

        assertThatThrownBy(() -> surveyService.getTmplat("T1"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Resource Not Found");
    }

    @Test
    @DisplayName("설문 템플릿 등록 - 성공")
    void insertTmplat_Success() {
        QustnrTmplatDto dto = QustnrTmplatDto.builder()
                .srvyTmplatTypeCd("TYPE_A")
                .srvyTmplatImgPath("/img/test.png")
                .srvyTmplatCn("내용")
                .build();

        surveyService.insertTmplat(dto);

        verify(tmplatRepository, times(1)).save(any(QustnrTmplat.class));
    }

    @Test
    @DisplayName("설문 템플릿 수정 - 성공")
    void updateTmplat_Success() {
        QustnrTmplat tmplat = QustnrTmplat.builder()
                .srvyTmplatId("T1")
                .srvyTmplatTypeCd("OLD")
                .build();
        given(tmplatRepository.findById("T1")).willReturn(Optional.of(tmplat));

        QustnrTmplatDto dto = QustnrTmplatDto.builder()
                .srvyTmplatId("T1")
                .srvyTmplatTypeCd("NEW")
                .build();

        surveyService.updateTmplat(dto);

        assertThat(tmplat.getSrvyTmplatTypeCd()).isEqualTo("NEW");
    }

    @Test
    @DisplayName("설문 템플릿 수정 - 자원 없음 예외")
    void updateTmplat_NotFound_ShouldThrowBusinessException() {
        given(tmplatRepository.findById("T1")).willReturn(Optional.empty());

        QustnrTmplatDto dto = QustnrTmplatDto.builder().srvyTmplatId("T1").build();

        assertThatThrownBy(() -> surveyService.updateTmplat(dto))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("설문 템플릿 삭제 - 성공")
    void deleteTmplat_Success() {
        surveyService.deleteTmplat("T1");
        verify(tmplatRepository, times(1)).deleteById("T1");
    }

    // ==========================================
    // 2. 설문 정보 테스트
    // ==========================================

    @Test
    @DisplayName("설문 정보 목록 조회 - 키워드 없음")
    void getSurveyList_NoKeyword() {
        Pageable pageable = PageRequest.of(0, 10);
        QustnrInfo info = QustnrInfo.builder().srvyId("S1").srvyTtl("Subject").build();
        given(infoRepository.findAll(pageable)).willReturn(new PageImpl<>(List.of(info)));

        Page<QustnrInfoDto> result = surveyService.getSurveyList(null, pageable);

        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("설문 정보 목록 조회 - 키워드 있음")
    void getSurveyList_WithKeyword() {
        Pageable pageable = PageRequest.of(0, 10);
        QustnrInfo info = QustnrInfo.builder().srvyId("S1").srvyTtl("Subject").build();
        given(infoRepository.findBySrvyTtlContaining(eq("Keyword"), any())).willReturn(new PageImpl<>(List.of(info)));

        Page<QustnrInfoDto> result = surveyService.getSurveyList("Keyword", pageable);

        assertThat(result.getContent()).hasSize(1);
        verify(infoRepository).findBySrvyTtlContaining(eq("Keyword"), any());
    }

    @Test
    @DisplayName("설문 정보 상세 조회 - 성공")
    void getSurvey_Success() {
        QustnrInfo info = QustnrInfo.builder().srvyId("S1").build();
        given(infoRepository.findById("S1")).willReturn(Optional.of(info));

        QustnrInfoDto result = surveyService.getSurvey("S1");

        assertThat(result.getSrvyId()).isEqualTo("S1");
    }

    @Test
    @DisplayName("설문 정보 상세 조회 - 자원 없음 예외")
    void getSurvey_NotFound_ShouldThrowBusinessException() {
        given(infoRepository.findById("S1")).willReturn(Optional.empty());

        assertThatThrownBy(() -> surveyService.getSurvey("S1"))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("설문 정보 등록 - 성공")
    void insertSurvey_Success() {
        QustnrInfoDto dto = QustnrInfoDto.builder()
                .srvyTtl("Subject")
                .srvyBgngYmd("2026-01-01")
                .srvyEndYmd("2026-01-31")
                .build();

        surveyService.insertSurvey(dto);

        verify(infoRepository, times(1)).save(any(QustnrInfo.class));
    }

    @Test
    @DisplayName("설문 정보 등록 - 기간 역전 시 예외 검증")
    void insertSurvey_InvalidDates_ShouldThrowException() {
        QustnrInfoDto dto = QustnrInfoDto.builder()
                .srvyTtl("Subject")
                .srvyBgngYmd("2026-01-31") // 시작일이 더 늦음
                .srvyEndYmd("2026-01-01")
                .build();

        assertThatThrownBy(() -> surveyService.insertSurvey(dto))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("설문 시작일은 종료일보다 빨라야 합니다.");
    }

    @Test
    @DisplayName("설문 정보 수정 - 성공")
    void updateSurvey_Success() {
        QustnrInfo info = QustnrInfo.builder()
                .srvyId("S1")
                .srvyTtl("OLD")
                .build();
        given(infoRepository.findById("S1")).willReturn(Optional.of(info));

        QustnrInfoDto dto = QustnrInfoDto.builder()
                .srvyId("S1")
                .srvyTtl("NEW")
                .srvyBgngYmd("2026-01-01")
                .srvyEndYmd("2026-01-10")
                .build();

        surveyService.updateSurvey(dto);

        assertThat(info.getSrvyTtl()).isEqualTo("NEW");
    }

    @Test
    @DisplayName("설문 정보 수정 - 자원 없음 예외")
    void updateSurvey_NotFound_ShouldThrowBusinessException() {
        given(infoRepository.findById("S1")).willReturn(Optional.empty());

        QustnrInfoDto dto = QustnrInfoDto.builder().srvyId("S1").build();

        assertThatThrownBy(() -> surveyService.updateSurvey(dto))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("설문 정보 삭제 - 성공")
    void deleteSurvey_Success() {
        surveyService.deleteSurvey("S1");
        verify(infoRepository, times(1)).deleteById("S1");
    }

    // ==========================================
    // 3. 설문 문항 테스트
    // ==========================================

    @Test
    @DisplayName("설문 문항 목록 조회")
    void getQuestionList() {
        QustnrQesitm question = QustnrQesitm.builder().srvyQitemId("Q1").srvyId("S1").srvyQitemSn(1L).build();
        given(qesitmRepository.findBySrvyIdOrderBySrvyQitemSnAsc("S1")).willReturn(List.of(question));

        QustnrIem item = QustnrIem.builder().srvyItemId("I1").srvyQitemId("Q1").srvyItemSn(1L).build();
        given(iemRepository.findBySrvyQitemIdOrderBySrvyItemSnAsc("Q1")).willReturn(List.of(item));

        List<QustnrQesitmDto> result = surveyService.getQuestionList("S1");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getSrvyQitemId()).isEqualTo("Q1");
        assertThat(result.get(0).getItems()).hasSize(1);
    }

    @Test
    @DisplayName("설문 문항 상세 조회 - 성공")
    void getQuestion_Success() {
        QustnrQesitm question = QustnrQesitm.builder().srvyQitemId("Q1").build();
        given(qesitmRepository.findById("Q1")).willReturn(Optional.of(question));

        QustnrQesitmDto result = surveyService.getQuestion("Q1");

        assertThat(result.getSrvyQitemId()).isEqualTo("Q1");
    }

    @Test
    @DisplayName("설문 문항 상세 조회 - 자원 없음 예외")
    void getQuestion_NotFound_ShouldThrowBusinessException() {
        given(qesitmRepository.findById("Q1")).willReturn(Optional.empty());

        assertThatThrownBy(() -> surveyService.getQuestion("Q1"))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("설문 문항 등록 - 성공")
    void insertQuestion_Success() {
        QustnrQesitmDto dto = QustnrQesitmDto.builder()
                .srvyId("S1")
                .srvyQitemSn(2L)
                .srvyQitemTypeCd("CHOICE")
                .srvyQitemCn("질문")
                .maxChcCnt(1)
                .srvyTmplatId("T1")
                .build();

        surveyService.insertQuestion(dto);

        verify(qesitmRepository, times(1)).save(any(QustnrQesitm.class));
    }

    @Test
    @DisplayName("설문 문항 수정 - 성공")
    void updateQuestion_Success() {
        QustnrQesitm question = QustnrQesitm.builder()
                .srvyQitemId("Q1")
                .srvyQitemCn("OLD")
                .build();
        given(qesitmRepository.findById("Q1")).willReturn(Optional.of(question));

        QustnrQesitmDto dto = QustnrQesitmDto.builder()
                .srvyQitemId("Q1")
                .srvyQitemCn("NEW")
                .srvyQitemSn(5L)
                .srvyQitemTypeCd("TEXT")
                .maxChcCnt(1)
                .build();

        surveyService.updateQuestion(dto);

        assertThat(question.getSrvyQitemCn()).isEqualTo("NEW");
        assertThat(question.getSrvyQitemSn()).isEqualTo(5L);
    }

    @Test
    @DisplayName("설문 문항 수정 - 자원 없음 예외")
    void updateQuestion_NotFound_ShouldThrowBusinessException() {
        given(qesitmRepository.findById("Q1")).willReturn(Optional.empty());

        QustnrQesitmDto dto = QustnrQesitmDto.builder().srvyQitemId("Q1").build();

        assertThatThrownBy(() -> surveyService.updateQuestion(dto))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("설문 문항 삭제 - 성공")
    void deleteQuestion_Success() {
        surveyService.deleteQuestion("Q1");
        verify(qesitmRepository, times(1)).deleteById("Q1");
    }

    // ==========================================
    // 4. 설문 항목 테스트
    // ==========================================

    @Test
    @DisplayName("설문 항목 목록 조회")
    void getItemList_Success() {
        QustnrIem item = QustnrIem.builder().srvyItemId("I1").srvyQitemId("Q1").srvyItemSn(1L).build();
        given(iemRepository.findBySrvyQitemIdOrderBySrvyItemSnAsc("Q1")).willReturn(List.of(item));

        List<QustnrIemDto> result = surveyService.getItemList("Q1");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getSrvyItemId()).isEqualTo("I1");
    }

    @Test
    @DisplayName("설문 항목 등록 - 성공")
    void insertItem_Success() {
        QustnrIemDto dto = QustnrIemDto.builder()
                .srvyQitemId("Q1")
                .srvyId("S1")
                .srvyItemSn(3L)
                .srvyItemCn("항목 3")
                .etcAnsYn("N")
                .srvyTmplatId("T1")
                .build();

        surveyService.insertItem(dto);

        verify(iemRepository, times(1)).save(any(QustnrIem.class));
    }

    @Test
    @DisplayName("설문 항목 수정 - 성공")
    void updateItem_Success() {
        QustnrIem item = QustnrIem.builder()
                .srvyItemId("I1")
                .srvyItemCn("OLD")
                .build();
        given(iemRepository.findById("I1")).willReturn(Optional.of(item));

        QustnrIemDto dto = QustnrIemDto.builder()
                .srvyItemId("I1")
                .srvyItemCn("NEW")
                .srvyItemSn(2L)
                .etcAnsYn("Y")
                .build();

        surveyService.updateItem(dto);

        assertThat(item.getSrvyItemCn()).isEqualTo("NEW");
        assertThat(item.getSrvyItemSn()).isEqualTo(2L);
        assertThat(item.getEtcAnsYn()).isEqualTo("Y");
    }

    @Test
    @DisplayName("설문 항목 수정 - 자원 없음 예외")
    void updateItem_NotFound_ShouldThrowBusinessException() {
        given(iemRepository.findById("I1")).willReturn(Optional.empty());

        QustnrIemDto dto = QustnrIemDto.builder().srvyItemId("I1").build();

        assertThatThrownBy(() -> surveyService.updateItem(dto))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("설문 항목 삭제 - 성공")
    void deleteItem_Success() {
        surveyService.deleteItem("I1");
        verify(iemRepository, times(1)).deleteById("I1");
    }
}
