package nuri.business.service.system.service.survey;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.system.service.survey.*;
import nuri.business.service.system.service.survey.dto.SurveyArticleDto;
import nuri.business.service.system.service.survey.dto.SurveyInfoDto;
import nuri.business.service.system.service.survey.dto.SurveyQuestionDto;
import nuri.business.service.system.service.survey.dto.SurveyTemplateDto;
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

    @org.mockito.Spy
    nuri.business.service.system.service.survey.dto.SurveyTemplateMapper surveyTemplateMapper = new nuri.business.service.system.service.survey.dto.SurveyTemplateMapperImpl();

    @org.mockito.Spy
    nuri.business.service.system.service.survey.dto.SurveyInfoMapper surveyInfoMapper = new nuri.business.service.system.service.survey.dto.SurveyInfoMapperImpl();

    @org.mockito.Spy
    nuri.business.service.system.service.survey.dto.SurveyQuestionMapper surveyQuestionMapper = new nuri.business.service.system.service.survey.dto.SurveyQuestionMapperImpl();

    @org.mockito.Spy
    nuri.business.service.system.service.survey.dto.SurveyArticleMapper surveyArticleMapper = new nuri.business.service.system.service.survey.dto.SurveyArticleMapperImpl();

    @InjectMocks
    private SurveyService surveyService;

    @Mock
    private SurveyTemplateRepository tmplatRepository;
    @Mock
    private SurveyInfoRepository infoRepository;
    @Mock
    private SurveyQuestionRepository qesitmRepository;
    @Mock
    private SurveyArticleRepository iemRepository;
    @Mock
    private SurveyResultRepository rsltRepository;
    @Mock
    private SurveyRespondentRepository rspdntRepository;

    // ==========================================
    // 1. 설문 템플릿 테스트
    // ==========================================

    @Test
    @DisplayName("설문 템플릿 목록 조회 - 키워드 없음")
    void getTmplatList_NoKeyword() {
        Pageable pageable = PageRequest.of(0, 10);
        SurveyTemplate tmplat = SurveyTemplate.builder().srvyTmpltSn(101L).srvyTmpltTypeCd("Type1").build();
        given(tmplatRepository.findAll(pageable)).willReturn(new PageImpl<>(List.of(tmplat)));

        Page<SurveyTemplateDto> result = surveyService.getTmplatList(null, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getSrvyTmpltSn()).isEqualTo(101L);
    }

    @Test
    @DisplayName("설문 템플릿 목록 조회 - 키워드 있음")
    void getTmplatList_WithKeyword() {
        Pageable pageable = PageRequest.of(0, 10);
        SurveyTemplate tmplat = SurveyTemplate.builder().srvyTmpltSn(101L).srvyTmpltTypeCd("Type1").build();
        given(tmplatRepository.findBySrvyTmpltTypeCdContaining(eq("Keyword"), any())).willReturn(new PageImpl<>(List.of(tmplat)));

        Page<SurveyTemplateDto> result = surveyService.getTmplatList("Keyword", pageable);

        assertThat(result.getContent()).hasSize(1);
        verify(tmplatRepository).findBySrvyTmpltTypeCdContaining(eq("Keyword"), any());
    }

    @Test
    @DisplayName("설문 템플릿 상세 조회 - 성공")
    void getTmplat_Success() {
        SurveyTemplate tmplat = SurveyTemplate.builder().srvyTmpltSn(101L).build();
        given(tmplatRepository.findById(101L)).willReturn(Optional.of(tmplat));

        SurveyTemplateDto result = surveyService.getTmplat(101L);

        assertThat(result.getSrvyTmpltSn()).isEqualTo(101L);
    }

    @Test
    @DisplayName("설문 템플릿 상세 조회 - 자원 없음 예외")
    void getTmplat_NotFound_ShouldThrowBusinessException() {
        given(tmplatRepository.findById(101L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> surveyService.getTmplat(101L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Resource Not Found");
    }

    @Test
    @DisplayName("설문 템플릿 등록 - 성공")
    void insertTmplat_Success() {
        SurveyTemplateDto dto = SurveyTemplateDto.builder()
                .srvyTmpltTypeCd("TYPE_A")
                .srvyTmpltPathNm("/img/test.png")
                .srvyTmpltExpln("내용")
                .build();

        surveyService.insertTmplat(dto);

        verify(tmplatRepository, times(1)).save(any(SurveyTemplate.class));
    }

    @Test
    @DisplayName("설문 템플릿 수정 - 성공")
    void updateTmplat_Success() {
        SurveyTemplate tmplat = SurveyTemplate.builder()
                .srvyTmpltSn(101L)
                .srvyTmpltTypeCd("OLD")
                .build();
        given(tmplatRepository.findById(101L)).willReturn(Optional.of(tmplat));

        SurveyTemplateDto dto = SurveyTemplateDto.builder()
                .srvyTmpltSn(101L)
                .srvyTmpltTypeCd("NEW")
                .build();

        surveyService.updateTmplat(dto);

        assertThat(tmplat.getSrvyTmpltTypeCd()).isEqualTo("NEW");
    }

    @Test
    @DisplayName("설문 템플릿 수정 - 자원 없음 예외")
    void updateTmplat_NotFound_ShouldThrowBusinessException() {
        given(tmplatRepository.findById(101L)).willReturn(Optional.empty());

        SurveyTemplateDto dto = SurveyTemplateDto.builder().srvyTmpltSn(101L).build();

        assertThatThrownBy(() -> surveyService.updateTmplat(dto))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("설문 템플릿 삭제 - 성공")
    void deleteTmplat_Success() {
        surveyService.deleteTmplat(101L);
        verify(tmplatRepository, times(1)).deleteById(101L);
    }

    // ==========================================
    // 2. 설문 정보 테스트
    // ==========================================

    @Test
    @DisplayName("설문 정보 목록 조회 - 키워드 없음")
    void getSurveyList_NoKeyword() {
        Pageable pageable = PageRequest.of(0, 10);
        SurveyInfo info = SurveyInfo.builder().srvySn(201L).srvyTtl("Subject").build();
        given(infoRepository.findAll(pageable)).willReturn(new PageImpl<>(List.of(info)));

        Page<SurveyInfoDto> result = surveyService.getSurveyList(null, pageable);

        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("설문 정보 목록 조회 - 키워드 있음")
    void getSurveyList_WithKeyword() {
        Pageable pageable = PageRequest.of(0, 10);
        SurveyInfo info = SurveyInfo.builder().srvySn(201L).srvyTtl("Subject").build();
        given(infoRepository.findBySrvyTtlContaining(eq("Keyword"), any())).willReturn(new PageImpl<>(List.of(info)));

        Page<SurveyInfoDto> result = surveyService.getSurveyList("Keyword", pageable);

        assertThat(result.getContent()).hasSize(1);
        verify(infoRepository).findBySrvyTtlContaining(eq("Keyword"), any());
    }

    @Test
    @DisplayName("설문 정보 상세 조회 - 성공")
    void getSurvey_Success() {
        SurveyInfo info = SurveyInfo.builder().srvySn(201L).build();
        given(infoRepository.findById(201L)).willReturn(Optional.of(info));

        SurveyInfoDto result = surveyService.getSurvey(201L);

        assertThat(result.getSrvySn()).isEqualTo(201L);
    }

    @Test
    @DisplayName("설문 정보 상세 조회 - 자원 없음 예외")
    void getSurvey_NotFound_ShouldThrowBusinessException() {
        given(infoRepository.findById(201L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> surveyService.getSurvey(201L))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("설문 정보 등록 - 성공")
    void insertSurvey_Success() {
        SurveyInfoDto dto = SurveyInfoDto.builder()
                .srvyTtl("Subject")
                .srvyTmpltSn(101L)
                .srvyBgngYmd("2026-01-01")
                .srvyEndYmd("2026-01-31")
                .build();
        given(tmplatRepository.existsById(101L)).willReturn(true);

        surveyService.insertSurvey(dto);

        verify(infoRepository, times(1)).save(any(SurveyInfo.class));
    }

    @Test
    @DisplayName("설문 정보 등록 - 기간 역전 시 예외 검증")
    void insertSurvey_InvalidDates_ShouldThrowException() {
        SurveyInfoDto dto = SurveyInfoDto.builder()
                .srvyTtl("Subject")
                .srvyTmpltSn(101L)
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
        SurveyInfo info = SurveyInfo.builder()
                .srvySn(201L)
                .srvyTtl("OLD")
                .build();
        given(infoRepository.findById(201L)).willReturn(Optional.of(info));
        given(tmplatRepository.existsById(101L)).willReturn(true);

        SurveyInfoDto dto = SurveyInfoDto.builder()
                .srvySn(201L)
                .srvyTmpltSn(101L)
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
        given(infoRepository.findById(201L)).willReturn(Optional.empty());
        given(tmplatRepository.existsById(101L)).willReturn(true);

        SurveyInfoDto dto = SurveyInfoDto.builder().srvySn(201L).srvyTmpltSn(101L).build();

        assertThatThrownBy(() -> surveyService.updateSurvey(dto))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("설문 정보 수정 - 문항이 있으면 템플릿 변경 거부")
    void updateSurvey_WithQuestions_ShouldRejectTemplateChange() {
        SurveyInfo info = SurveyInfo.builder()
                .srvySn(201L)
                .srvyTmpltSn(101L)
                .srvyTtl("OLD")
                .build();
        given(infoRepository.findById(201L)).willReturn(Optional.of(info));
        given(tmplatRepository.existsById(102L)).willReturn(true);
        given(qesitmRepository.existsBySrvySn(201L)).willReturn(true);

        SurveyInfoDto dto = SurveyInfoDto.builder()
                .srvySn(201L)
                .srvyTmpltSn(102L)
                .srvyTtl("NEW")
                .build();

        assertThatThrownBy(() -> surveyService.updateSurvey(dto))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("템플릿은 변경할 수 없습니다");
        assertThat(info.getSrvyTmpltSn()).isEqualTo(101L);
    }

    @Test
    @DisplayName("설문 정보 삭제 - 성공")
    void deleteSurvey_Success() {
        surveyService.deleteSurvey(201L);
        verify(infoRepository, times(1)).deleteById(201L);
    }

    // ==========================================
    // 3. 설문 문항 테스트
    // ==========================================

    @Test
    @DisplayName("설문 문항 목록 조회")
    void getQuestionList() {
        SurveyQuestion question = SurveyQuestion.builder().srvyQstnSn(301L).srvySn(201L).qstnSn(1L).build();
        given(qesitmRepository.findBySrvySnOrderByQstnSnAsc(201L)).willReturn(List.of(question));

        SurveyArticle item = SurveyArticle.builder().srvyArtclSn(401L).srvyQstnSn(301L).artclSn(1L).build();
        given(iemRepository.findBySrvyQstnSnInOrderBySrvyQstnSnAscArtclSnAsc(anyList())).willReturn(List.of(item));

        List<SurveyQuestionDto> result = surveyService.getQuestionList(201L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getSrvyQstnSn()).isEqualTo(301L);
        assertThat(result.get(0).getItems()).hasSize(1);
    }

    @Test
    @DisplayName("설문 문항 상세 조회 - 성공")
    void getQuestion_Success() {
        SurveyQuestion question = SurveyQuestion.builder().srvyQstnSn(301L).build();
        given(qesitmRepository.findById(301L)).willReturn(Optional.of(question));

        SurveyQuestionDto result = surveyService.getQuestion(301L);

        assertThat(result.getSrvyQstnSn()).isEqualTo(301L);
    }

    @Test
    @DisplayName("설문 문항 상세 조회 - 자원 없음 예외")
    void getQuestion_NotFound_ShouldThrowBusinessException() {
        given(qesitmRepository.findById(301L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> surveyService.getQuestion(301L))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("설문 문항 등록 - 성공")
    void insertQuestion_Success() {
        SurveyQuestionDto dto = SurveyQuestionDto.builder()
                .srvySn(201L)
                .qstnSn(2L)
                .qstnTypeCd("CHOICE")
                .qstnCn("질문")
                .maxChcCnt(1)
                .build();
        given(infoRepository.findById(201L)).willReturn(Optional.of(
                SurveyInfo.builder().srvySn(201L).srvyTmpltSn(101L).build()));

        surveyService.insertQuestion(dto);

        verify(qesitmRepository, times(1)).save(any(SurveyQuestion.class));
    }

    @Test
    @DisplayName("설문 문항 수정 - 성공")
    void updateQuestion_Success() {
        SurveyQuestion question = SurveyQuestion.builder()
                .srvyQstnSn(301L)
                .qstnCn("OLD")
                .build();
        given(qesitmRepository.findById(301L)).willReturn(Optional.of(question));

        SurveyQuestionDto dto = SurveyQuestionDto.builder()
                .srvyQstnSn(301L)
                .qstnCn("NEW")
                .qstnSn(5L)
                .qstnTypeCd("TEXT")
                .maxChcCnt(1)
                .build();

        surveyService.updateQuestion(dto);

        assertThat(question.getQstnCn()).isEqualTo("NEW");
        assertThat(question.getQstnSn()).isEqualTo(5L);
    }

    @Test
    @DisplayName("설문 문항 수정 - 자원 없음 예외")
    void updateQuestion_NotFound_ShouldThrowBusinessException() {
        given(qesitmRepository.findById(301L)).willReturn(Optional.empty());

        SurveyQuestionDto dto = SurveyQuestionDto.builder().srvyQstnSn(301L).build();

        assertThatThrownBy(() -> surveyService.updateQuestion(dto))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("설문 문항 삭제 - 성공")
    void deleteQuestion_Success() {
        surveyService.deleteQuestion(301L);
        verify(qesitmRepository, times(1)).deleteById(301L);
    }

    // ==========================================
    // 4. 설문 항목 테스트
    // ==========================================

    @Test
    @DisplayName("설문 항목 목록 조회")
    void getItemList_Success() {
        SurveyArticle item = SurveyArticle.builder().srvyArtclSn(401L).srvyQstnSn(301L).artclSn(1L).build();
        given(iemRepository.findBySrvyQstnSnOrderByArtclSnAsc(301L)).willReturn(List.of(item));

        List<SurveyArticleDto> result = surveyService.getItemList(301L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getSrvyArtclSn()).isEqualTo(401L);
    }

    @Test
    @DisplayName("설문 항목 등록 - 성공")
    void insertItem_Success() {
        SurveyArticleDto dto = SurveyArticleDto.builder()
                .srvyQstnSn(301L)
                .artclSn(3L)
                .artclCn("항목 3")
                .etcAnsYn("N")
                .build();
        given(qesitmRepository.findById(301L)).willReturn(Optional.of(
                SurveyQuestion.builder().srvyQstnSn(301L).srvySn(201L).srvyTmpltSn(101L).build()));

        surveyService.insertItem(dto);

        verify(iemRepository, times(1)).save(any(SurveyArticle.class));
    }

    @Test
    @DisplayName("설문 항목 수정 - 성공")
    void updateItem_Success() {
        SurveyArticle item = SurveyArticle.builder()
                .srvyArtclSn(401L)
                .artclCn("OLD")
                .build();
        given(iemRepository.findById(401L)).willReturn(Optional.of(item));

        SurveyArticleDto dto = SurveyArticleDto.builder()
                .srvyArtclSn(401L)
                .artclCn("NEW")
                .artclSn(2L)
                .etcAnsYn("Y")
                .build();

        surveyService.updateItem(dto);

        assertThat(item.getArtclCn()).isEqualTo("NEW");
        assertThat(item.getArtclSn()).isEqualTo(2L);
        assertThat(item.getEtcAnsYn()).isEqualTo("Y");
    }

    @Test
    @DisplayName("설문 항목 수정 - 자원 없음 예외")
    void updateItem_NotFound_ShouldThrowBusinessException() {
        given(iemRepository.findById(401L)).willReturn(Optional.empty());

        SurveyArticleDto dto = SurveyArticleDto.builder().srvyArtclSn(401L).build();

        assertThatThrownBy(() -> surveyService.updateItem(dto))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("설문 항목 삭제 - 성공")
    void deleteItem_Success() {
        surveyService.deleteItem(401L);
        verify(iemRepository, times(1)).deleteById(401L);
    }
}
