package nuri.business.service.survey;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.business.domain.survey.*;
import nuri.business.service.survey.dto.SurveyArticleDto;
import nuri.business.service.survey.dto.SurveyInfoDto;
import nuri.business.service.survey.dto.SurveyQuestionDto;
import nuri.business.service.survey.dto.SurveyTemplateDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
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

    /** 쓰기 서비스는 현재 권한을 다시 본다(백엔드 헌법 제8조). 권한을 따로 쥐지 않은 시험은 관리자로 돈다. */
    @org.junit.jupiter.api.BeforeEach
    void authorizeServiceGuard() {
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_ADMIN"));
    }

    @org.junit.jupiter.api.AfterEach
    void clearServiceGuard() {
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }

    @org.mockito.Spy
    nuri.business.service.survey.dto.SurveyTemplateMapper surveyTemplateMapper = new nuri.business.service.survey.dto.SurveyTemplateMapperImpl();

    @org.mockito.Spy
    nuri.business.service.survey.dto.SurveyInfoMapper surveyInfoMapper = new nuri.business.service.survey.dto.SurveyInfoMapperImpl();

    @org.mockito.Spy
    nuri.business.service.survey.dto.SurveyQuestionMapper surveyQuestionMapper = new nuri.business.service.survey.dto.SurveyQuestionMapperImpl();

    @org.mockito.Spy
    nuri.business.service.survey.dto.SurveyArticleMapper surveyArticleMapper = new nuri.business.service.survey.dto.SurveyArticleMapperImpl();

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
        given(tmplatRepository.existsById(101L)).willReturn(true);
        given(infoRepository.countBySrvyTmpltSn(101L)).willReturn(0L);
        surveyService.deleteTmplat(101L);
        verify(tmplatRepository, times(1)).deleteById(101L);
    }

    @Test
    @DisplayName("설문 템플릿 삭제 - 이 템플릿으로 만든 설문이 있으면 건수를 밝혀 409 로 거부한다")
    void deleteTmplat_InUse_RejectsWithCount() {
        // [2026-10-01] 종전에는 외래 키 오류가 사유 없는 409 기본 문구로 보였다.
        given(tmplatRepository.existsById(101L)).willReturn(true);
        given(infoRepository.countBySrvyTmpltSn(101L)).willReturn(3L);

        assertThatThrownBy(() -> surveyService.deleteTmplat(101L))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getErrorCode()).isEqualTo(CommonErrorCode.RESOURCE_IN_USE);
                    assertThat(exception.getMessage()).contains("설문이 3건 있어 삭제할 수 없습니다");
                });
        verify(tmplatRepository, never()).deleteById(any());
    }

    @Test
    @DisplayName("설문 템플릿 삭제 - 없는 템플릿은 조용히 성공하지 않고 404 다")
    void deleteTmplat_Missing_NotFound() {
        given(tmplatRepository.existsById(999L)).willReturn(false);

        assertThatThrownBy(() -> surveyService.deleteTmplat(999L))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(CommonErrorCode.RESOURCE_NOT_FOUND));
        verify(tmplatRepository, never()).deleteById(any());
    }

    // ==========================================
    // 2. 설문 정보 테스트
    // ==========================================

    @Test
    @DisplayName("설문 정보 목록 조회 - 키워드 없음")
    void getSurveyList_NoKeyword() {
        // 작성 중 설문을 함께 보는 편집자 조회가 아니라 응답자의 목록이다.
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
        Pageable pageable = PageRequest.of(0, 10);
        SurveyInfo info = SurveyInfo.builder().srvySn(201L).srvyTtl("Subject").build();
        given(infoRepository.findByRlsYn("Y", pageable)).willReturn(new PageImpl<>(List.of(info)));

        Page<SurveyInfoDto> result = surveyService.getSurveyList(null, pageable);

        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("🚨 설문 목록은 현재 사용자의 응답 여부를 한 번의 조회로 싣는다 (2026-10-01)")
    void getSurveyList_marksResponded() {
        Pageable pageable = PageRequest.of(0, 10);
        given(infoRepository.findByRlsYn("Y", pageable)).willReturn(new PageImpl<>(List.of(
                SurveyInfo.builder().srvySn(201L).build(), SurveyInfo.builder().srvySn(202L).build())));
        given(rsltRepository.findRespondedSurveySns("user1", List.of(201L, 202L))).willReturn(List.of(202L));

        try (var mocked = org.mockito.Mockito.mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mocked.when(nuri.business.security.util.SecurityUtil::getCurrentLoginId).thenReturn(Optional.of("user1"));
            assertThat(surveyService.getSurveyList(null, pageable).getContent())
                    .extracting(SurveyInfoDto::getResponded).containsExactly(false, true);

            mocked.when(nuri.business.security.util.SecurityUtil::getCurrentLoginId).thenReturn(Optional.empty());
            assertThat(surveyService.getSurveyList(null, pageable).getContent())
                    .extracting(SurveyInfoDto::getResponded).containsOnlyNulls();
        }
    }

    @Test
    @DisplayName("🚨 작성 중인 설문은 응답자 목록·상세에서 빠지고, 설문을 고치는 권한자에게만 보인다 (2026-10-01 결정 21)")
    void draftSurveyVisibleOnlyToEditors() {
        Pageable pageable = PageRequest.of(0, 10);
        SurveyInfo draft = SurveyInfo.builder().srvySn(301L).srvyTtl("작성 중").build();
        given(infoRepository.findById(301L)).willReturn(Optional.of(draft));
        given(infoRepository.findAll(pageable)).willReturn(new PageImpl<>(List.of(draft)));
        given(infoRepository.findByRlsYn("Y", pageable)).willReturn(new PageImpl<>(List.of()));

        try (var mocked = org.mockito.Mockito.mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mocked.when(nuri.business.security.util.SecurityUtil::getCurrentLoginId).thenReturn(Optional.empty());
            assertThat(surveyService.getSurveyList(null, pageable).getContent()).isEmpty();
            assertThatThrownBy(() -> surveyService.getSurvey(301L))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.RESOURCE_NOT_FOUND);

            mocked.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("SURVEY_UPDATE_ALL")).thenReturn(true);
            assertThat(surveyService.getSurveyList(null, pageable).getContent()).extracting(SurveyInfoDto::getRlsYn).containsExactly("N");
            assertThat(surveyService.getSurvey(301L).getRlsYn()).isEqualTo("N");
        }
    }

    @Test
    @DisplayName("🚨 공개 여부는 값이 올 때만 바뀐다 — 제목만 고치는 저장은 공개 상태를 되돌리지 않는다 (2026-10-01 결정 21)")
    void updateSurvey_changesReleaseOnlyWhenGiven() {
        SurveyInfo entity = SurveyInfo.builder().srvySn(201L).srvyTtl("제목").srvyTmpltSn(101L).build();
        org.springframework.test.util.ReflectionTestUtils.setField(entity, "version", 0);
        given(tmplatRepository.existsById(101L)).willReturn(true);
        given(infoRepository.findByIdForSubmission(201L)).willReturn(Optional.of(entity));

        SurveyInfoDto publish = SurveyInfoDto.builder().srvySn(201L).srvyTtl("제목").srvyTmpltSn(101L).rlsYn("Y").version(0).build();
        surveyService.updateSurvey(publish);
        assertThat(entity.isReleased()).isTrue();

        // 단위 시험은 flush 가 없어 버전이 오르지 않는다 — 같은 버전으로 다시 저장한다(실제 화면은 다시 읽은 버전을 보낸다).
        SurveyInfoDto titleOnly = SurveyInfoDto.builder().srvySn(201L).srvyTtl("새 제목").srvyTmpltSn(101L).version(0).build();
        surveyService.updateSurvey(titleOnly);
        assertThat(entity.isReleased()).isTrue();
    }

    @Test
    @DisplayName("🚨 응답이 있는 설문에는 문항·선택 항목을 더하지 않는다(409) (2026-10-01 결정 21)")
    void insertQuestionAndItem_rejectedAfterResponses() {
        given(infoRepository.findByIdForSubmission(201L)).willReturn(Optional.of(SurveyInfo.builder().srvySn(201L).srvyTmpltSn(101L).build()));
        given(infoRepository.findSurveyIdByQuestionId(401L)).willReturn(Optional.of(201L));
        given(qesitmRepository.findById(401L)).willReturn(Optional.of(SurveyQuestion.builder().srvyQstnSn(401L).srvySn(201L).build()));
        given(rsltRepository.existsBySrvySn(201L)).willReturn(true);

        assertThatThrownBy(() -> surveyService.insertQuestion(SurveyQuestionDto.builder().srvySn(201L).qstnCn("새 문항").build()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.RESOURCE_IN_USE);
        assertThatThrownBy(() -> surveyService.insertItem(SurveyArticleDto.builder().srvyQstnSn(401L).artclCn("새 항목").build()))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.RESOURCE_IN_USE);
        verify(qesitmRepository, never()).save(any());
        verify(iemRepository, never()).save(any());
    }

    @Test
    @DisplayName("설문 정보 목록 조회 - 키워드 있음")
    void getSurveyList_WithKeyword() {
        // 작성 중 설문을 함께 보는 편집자 조회가 아니라 응답자의 목록이다.
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
        Pageable pageable = PageRequest.of(0, 10);
        SurveyInfo info = SurveyInfo.builder().srvySn(201L).srvyTtl("Subject").build();
        given(infoRepository.findByRlsYnAndSrvyTtlContaining(eq("Y"), eq("Keyword"), any())).willReturn(new PageImpl<>(List.of(info)));

        Page<SurveyInfoDto> result = surveyService.getSurveyList("Keyword", pageable);

        assertThat(result.getContent()).hasSize(1);
        verify(infoRepository).findByRlsYnAndSrvyTtlContaining(eq("Y"), eq("Keyword"), any());
    }

    @Test
    @DisplayName("설문 정보 상세 조회 - 성공")
    void getSurvey_Success() {
        SurveyInfo info = SurveyInfo.builder().srvySn(201L).build();
        info.changeRelease(true);
        given(infoRepository.findById(201L)).willReturn(Optional.of(info));

        SurveyInfoDto result = surveyService.getSurvey(201L);

        assertThat(result.getSrvySn()).isEqualTo(201L);
    }

    @Test
    @DisplayName("🚨 설문 상세는 현재 사용자의 응답 여부를 싣는다 — 로그인 ID 축 (DIP V8)")
    void getSurvey_carriesRespondedForViewer() {
        SurveyInfo released = SurveyInfo.builder().srvySn(201L).build();
        released.changeRelease(true);
        given(infoRepository.findById(201L)).willReturn(Optional.of(released));
        given(rsltRepository.existsBySrvySnAndFrstRgtrId(201L, "user1")).willReturn(true);

        try (var mocked = org.mockito.Mockito.mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mocked.when(nuri.business.security.util.SecurityUtil::getCurrentLoginId)
                    .thenReturn(Optional.of("user1"));
            assertThat(surveyService.getSurvey(201L).getResponded()).isTrue();

            // 인증 주체가 없으면 판정하지 않는다(null) — false 로 '응답하지 않았다' 고 말하지 않는다.
            mocked.when(nuri.business.security.util.SecurityUtil::getCurrentLoginId).thenReturn(Optional.empty());
            assertThat(surveyService.getSurvey(201L).getResponded()).isNull();
        }
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
        org.springframework.test.util.ReflectionTestUtils.setField(info, "version", 0);
        given(infoRepository.findByIdForSubmission(201L)).willReturn(Optional.of(info));
        given(tmplatRepository.existsById(101L)).willReturn(true);

        SurveyInfoDto dto = SurveyInfoDto.builder()
                .srvySn(201L)
                .srvyTmpltSn(101L)
                .srvyTtl("NEW")
                .srvyBgngYmd("2026-01-01")
                .srvyEndYmd("2026-01-10")
                .version(0)
                .build();

        surveyService.updateSurvey(dto);

        assertThat(info.getSrvyTtl()).isEqualTo("NEW");
    }

    @Test
    @DisplayName("[2026-10-18] 설문 정보 수정 - 읽은 버전이 다르면 409(공개 전환도 같다), 버전이 없으면 400 이고 바꾸지 않는다")
    void updateSurvey_rejectsStaleOrMissingVersion() {
        SurveyInfo info = SurveyInfo.builder().srvySn(201L).srvyTtl("CURRENT").srvyTmpltSn(101L).build();
        org.springframework.test.util.ReflectionTestUtils.setField(info, "version", 2);
        given(infoRepository.findByIdForSubmission(201L)).willReturn(Optional.of(info));
        given(tmplatRepository.existsById(101L)).willReturn(true);

        assertThatThrownBy(() -> surveyService.updateSurvey(SurveyInfoDto.builder()
                .srvySn(201L).srvyTmpltSn(101L).srvyTtl("STALE").rlsYn("Y").version(1).build()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.CONCURRENT_MODIFICATION);
        assertThatThrownBy(() -> surveyService.updateSurvey(SurveyInfoDto.builder()
                .srvySn(201L).srvyTmpltSn(101L).srvyTtl("NO VERSION").build()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        assertThat(info.getSrvyTtl()).isEqualTo("CURRENT");
        assertThat(info.isReleased()).isFalse();
    }

    @Test
    @DisplayName("설문 정보 수정 - 자원 없음 예외")
    void updateSurvey_NotFound_ShouldThrowBusinessException() {
        given(infoRepository.findByIdForSubmission(201L)).willReturn(Optional.empty());
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
        org.springframework.test.util.ReflectionTestUtils.setField(info, "version", 0);
        given(infoRepository.findByIdForSubmission(201L)).willReturn(Optional.of(info));
        given(tmplatRepository.existsById(102L)).willReturn(true);
        given(qesitmRepository.existsBySrvySn(201L)).willReturn(true);

        SurveyInfoDto dto = SurveyInfoDto.builder()
                .srvySn(201L)
                .srvyTmpltSn(102L)
                .srvyTtl("NEW")
                .version(0)
                .build();

        assertThatThrownBy(() -> surveyService.updateSurvey(dto))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("템플릿은 변경할 수 없습니다");
        assertThat(info.getSrvyTmpltSn()).isEqualTo(101L);
    }

    @Test
    @DisplayName("설문 정보 삭제 - 성공")
    void deleteSurvey_Success() {
        given(infoRepository.findByIdForSubmission(201L)).willReturn(Optional.of(SurveyInfo.builder().srvySn(201L).build()));
        surveyService.deleteSurvey(201L);
        verify(infoRepository, times(1)).deleteById(201L);
    }

    // ==========================================
    // 3. 설문 문항 테스트
    // ==========================================

    @Test
    @DisplayName("설문 문항 목록 조회")
    void getQuestionList() {
        SurveyInfo released = SurveyInfo.builder().srvySn(201L).srvyTtl("공개 설문").build();
        released.changeRelease(true);
        given(infoRepository.findById(201L)).willReturn(Optional.of(released));

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
    @DisplayName("🔒 작성 중인 설문의 문항 목록은 편집 권한 없는 사용자에게 404 로 숨긴다")
    void getQuestionList_draftSurveyRejectedForNonEditors() {
        SurveyInfo draft = SurveyInfo.builder().srvySn(301L).srvyTtl("작성 중").build();
        given(infoRepository.findById(301L)).willReturn(Optional.of(draft));
        given(qesitmRepository.findBySrvySnOrderByQstnSnAsc(301L)).willReturn(List.of());

        try (var mocked = org.mockito.Mockito.mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mocked.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("SURVEY_UPDATE_ALL")).thenReturn(false);
            assertThatThrownBy(() -> surveyService.getQuestionList(301L))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.RESOURCE_NOT_FOUND);

            mocked.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("SURVEY_UPDATE_ALL")).thenReturn(true);
            assertThat(surveyService.getQuestionList(301L)).isEmpty();
        }
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
        given(infoRepository.findByIdForSubmission(201L)).willReturn(Optional.of(
                SurveyInfo.builder().srvySn(201L).srvyTmpltSn(101L).build()));

        surveyService.insertQuestion(dto);

        verify(qesitmRepository, times(1)).save(any(SurveyQuestion.class));
    }

    @Test
    @DisplayName("설문 문항 수정 - 성공")
    void updateQuestion_Success() {
        SurveyQuestion question = SurveyQuestion.builder()
                .srvyQstnSn(301L)
                .srvySn(201L)
                .qstnCn("OLD")
                .build();
        given(qesitmRepository.findById(301L)).willReturn(Optional.of(question));
        givenQuestionSurvey(301L);

        SurveyQuestionDto dto = SurveyQuestionDto.builder()
                .srvyQstnSn(301L)
                .srvySn(201L)
                .qstnCn("NEW")
                .qstnSn(5L)
                .qstnTypeCd("TEXT")
                .maxChcCnt(1)
                .build();

        surveyService.updateQuestion(dto);

        assertThat(question.getQstnCn()).isEqualTo("NEW");
        assertThat(question.getQstnSn()).isEqualTo(5L);
        assertThat(question.getSrvySn()).isEqualTo(201L);
        assertThat(question.getQstnTypeCd()).isEqualTo("TEXT");
        assertThat(question.getMaxChcCnt()).isEqualTo(1);
    }

    @ParameterizedTest
    @ValueSource(longs = {0, 3})
    @DisplayName("다른 설문 경로로 문항을 수정하면 응답 유무와 무관하게 404이며 모든 문항 필드를 보존한다")
    void updateQuestion_wrongParentPreservesQuestion(long responseCount) {
        SurveyQuestion question = SurveyQuestion.builder()
                .srvyQstnSn(301L).srvySn(201L).srvyTmpltSn(101L)
                .qstnSn(2L).qstnTypeCd("1").qstnCn("원래 문항").maxChcCnt(3).build();
        givenQuestionSurvey(301L);
        given(infoRepository.findByIdForSubmission(999L)).willReturn(Optional.of(
                SurveyInfo.builder().srvySn(999L).srvyTmpltSn(901L).build()));
        given(qesitmRepository.findById(301L)).willReturn(Optional.of(question));
        given(rsltRepository.countBySrvyQstnSn(301L)).willReturn(responseCount);

        assertThatThrownBy(() -> surveyService.updateQuestion(SurveyQuestionDto.builder()
                .srvyQstnSn(301L).srvySn(999L).srvyTmpltSn(901L)
                .qstnSn(8L).qstnTypeCd("2").qstnCn("다른 설문에서 보낸 수정").maxChcCnt(1).build()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.RESOURCE_NOT_FOUND);

        assertThat(question).extracting("srvyQstnSn", "srvySn", "srvyTmpltSn",
                        "qstnSn", "qstnTypeCd", "qstnCn", "maxChcCnt")
                .containsExactly(301L, 201L, 101L, 2L, "1", "원래 문항", 3);
        verify(qesitmRepository, never()).save(any());
        verify(iemRepository, never()).save(any());
        verify(iemRepository, never()).deleteBySrvyQstnSn(anyLong());
        verify(rsltRepository, never()).deleteBySrvyQstnSn(anyLong());
        verify(rsltRepository, never()).countBySrvyQstnSn(anyLong());
    }

    @Test
    @DisplayName("부모 설문 번호가 없는 문항 수정은 응답 여부를 확인하기 전에 404로 거부한다")
    void updateQuestion_missingParentPreservesQuestion() {
        givenQuestionSurvey(301L);
        SurveyQuestion question = SurveyQuestion.builder()
                .srvyQstnSn(301L).srvySn(201L).srvyTmpltSn(101L)
                .qstnSn(2L).qstnTypeCd("1").qstnCn("원래 문항").maxChcCnt(3).build();
        given(qesitmRepository.findById(301L)).willReturn(Optional.of(question));

        assertThatThrownBy(() -> surveyService.updateQuestion(SurveyQuestionDto.builder()
                .srvyQstnSn(301L).qstnSn(8L).qstnTypeCd("2")
                .qstnCn("변경 요청 문항").maxChcCnt(1).build()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.RESOURCE_NOT_FOUND);

        assertThat(question).extracting("srvyQstnSn", "srvySn", "srvyTmpltSn",
                        "qstnSn", "qstnTypeCd", "qstnCn", "maxChcCnt")
                .containsExactly(301L, 201L, 101L, 2L, "1", "원래 문항", 3);
        verify(rsltRepository, never()).countBySrvyQstnSn(anyLong());
        verify(iemRepository, never()).save(any());
        verify(iemRepository, never()).deleteBySrvyQstnSn(anyLong());
    }

    @Test
    @DisplayName("[DIP B4 P6] 문항 순번은 서버가 가장 큰 순번 다음으로 매긴다 — 화면이 보낸 '문항 수 + 1' 은 쓰지 않는다")
    void insertQuestion_assignsNextOrder() {
        given(infoRepository.findByIdForSubmission(201L)).willReturn(Optional.of(
                SurveyInfo.builder().srvySn(201L).srvyTmpltSn(101L).build()));
        given(qesitmRepository.findBySrvySnOrderByQstnSnAsc(201L)).willReturn(List.of(
                SurveyQuestion.builder().srvyQstnSn(1L).srvySn(201L).qstnSn(1L).build(),
                SurveyQuestion.builder().srvyQstnSn(3L).srvySn(201L).qstnSn(3L).build()));

        surveyService.insertQuestion(SurveyQuestionDto.builder()
                .srvySn(201L).qstnSn(3L).qstnTypeCd("1").qstnCn("새 문항").maxChcCnt(2).build());

        org.mockito.ArgumentCaptor<SurveyQuestion> saved = org.mockito.ArgumentCaptor.forClass(SurveyQuestion.class);
        verify(qesitmRepository).save(saved.capture());
        assertThat(saved.getValue().getQstnSn()).isEqualTo(4L);
        assertThat(saved.getValue().getMaxChcCnt()).isEqualTo(2);
    }

    @Test
    @DisplayName("[DIP B4 P6] 응답이 모인 문항은 문구·선택 수를 바꿀 수 없고(409) 순번만 바꿀 수 있다")
    void updateQuestion_lockedAfterResponses() {
        SurveyQuestion question = SurveyQuestion.builder()
                .srvyQstnSn(301L).srvySn(201L).qstnSn(1L).qstnTypeCd("1").qstnCn("원래 문항").maxChcCnt(null).build();
        given(qesitmRepository.findById(301L)).willReturn(Optional.of(question));
        givenQuestionSurvey(301L);
        given(rsltRepository.countBySrvyQstnSn(301L)).willReturn(3L);

        assertThatThrownBy(() -> surveyService.updateQuestion(SurveyQuestionDto.builder()
                .srvyQstnSn(301L).srvySn(201L).qstnSn(1L).qstnTypeCd("1").qstnCn("바꾼 문항").maxChcCnt(1).build()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", nuri.foundation.core.exception.CommonErrorCode.RESOURCE_IN_USE);
        assertThatThrownBy(() -> surveyService.updateQuestion(SurveyQuestionDto.builder()
                .srvyQstnSn(301L).srvySn(201L).qstnSn(1L).qstnTypeCd("1").qstnCn("원래 문항").maxChcCnt(3).build()))
                .isInstanceOf(BusinessException.class);
        assertThat(question.getQstnCn()).isEqualTo("원래 문항");

        // 순번만 바꾸는 것은 응답의 뜻을 바꾸지 않는다 — NULL 과 1 은 같은 '하나만 고르기' 다.
        surveyService.updateQuestion(SurveyQuestionDto.builder()
                .srvyQstnSn(301L).srvySn(201L).qstnSn(5L).qstnTypeCd("1").qstnCn("원래 문항").maxChcCnt(1).build());
        assertThat(question.getQstnSn()).isEqualTo(5L);
    }

    @Test
    @DisplayName("[DIP B4 P6] 응답이 모인 문항의 선택지 문구는 바꿀 수 없다(409)")
    void updateItem_lockedAfterResponses() {
        SurveyArticle item = SurveyArticle.builder().srvyArtclSn(401L).srvySn(201L).srvyQstnSn(301L).artclCn("예").build();
        given(iemRepository.findById(401L)).willReturn(Optional.of(item));
        givenItemSurvey(401L);
        given(rsltRepository.countBySrvyQstnSn(301L)).willReturn(2L);

        assertThatThrownBy(() -> surveyService.updateItem(SurveyArticleDto.builder()
                .srvyArtclSn(401L).artclSn(1L).artclCn("아니오").build()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", nuri.foundation.core.exception.CommonErrorCode.RESOURCE_IN_USE);
        assertThat(item.getArtclCn()).isEqualTo("예");
    }

    @Test
    @DisplayName("설문 문항 수정 - 자원 없음 예외")
    void updateQuestion_NotFound_ShouldThrowBusinessException() {
        given(infoRepository.findSurveyIdByQuestionId(301L)).willReturn(Optional.empty());

        SurveyQuestionDto dto = SurveyQuestionDto.builder().srvyQstnSn(301L).srvySn(201L).build();

        assertThatThrownBy(() -> surveyService.updateQuestion(dto))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("설문 문항 삭제 - 성공")
    void deleteQuestion_Success() {
        SurveyQuestion question = SurveyQuestion.builder()
                .srvyQstnSn(301L)
                .srvySn(201L)
                .srvyTmpltSn(101L)
                .build();
        given(qesitmRepository.findById(301L)).willReturn(Optional.of(question));
        given(infoRepository.findByIdForSubmission(201L)).willReturn(Optional.of(SurveyInfo.builder().srvySn(201L).build()));

        surveyService.deleteQuestion(201L, 301L);

        verify(qesitmRepository, times(1)).deleteById(301L);
    }

    @Test
    @DisplayName("설문 문항 삭제 - 다른 설문의 문항이면 거부")
    void deleteQuestion_WrongSurvey_ShouldThrowBusinessException() {
        SurveyQuestion question = SurveyQuestion.builder()
                .srvyQstnSn(301L)
                .srvySn(999L)
                .srvyTmpltSn(101L)
                .build();
        given(qesitmRepository.findById(301L)).willReturn(Optional.of(question));
        given(infoRepository.findByIdForSubmission(201L)).willReturn(Optional.of(SurveyInfo.builder().srvySn(201L).build()));

        assertThatThrownBy(() -> surveyService.deleteQuestion(201L, 301L))
                .isInstanceOf(BusinessException.class);
        verify(qesitmRepository, never()).deleteById(anyLong());
    }

    /**
     * [2026-09-14 DEC-OPS-095] 응답이 있는 문항·항목을 지우면 이미 모은 응답이 경고 없이 사라졌다(V2_13 의 FK 선정리).
     * 응답이 있으면 409 로 막고 응답·항목·문항을 하나도 지우지 않는다.
     */
    @Test
    @DisplayName("응답이 있는 문항은 삭제하지 않고 응답도 보존한다")
    void deleteQuestion_WithResponses_IsBlocked() {
        SurveyQuestion question = SurveyQuestion.builder().srvyQstnSn(301L).srvySn(201L).srvyTmpltSn(101L).build();
        given(qesitmRepository.findById(301L)).willReturn(Optional.of(question));
        given(infoRepository.findByIdForSubmission(201L)).willReturn(Optional.of(SurveyInfo.builder().srvySn(201L).build()));
        given(rsltRepository.countBySrvyQstnSn(301L)).willReturn(3L);

        assertThatThrownBy(() -> surveyService.deleteQuestion(201L, 301L))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(nuri.foundation.core.exception.CommonErrorCode.RESOURCE_IN_USE);
        verify(rsltRepository, never()).deleteBySrvyQstnSn(anyLong());
        verify(iemRepository, never()).deleteBySrvyQstnSn(anyLong());
        verify(qesitmRepository, never()).deleteById(anyLong());
    }

    @Test
    @DisplayName("응답이 있는 선택 항목은 삭제하지 않고 응답도 보존한다")
    void deleteItem_WithResponses_IsBlocked() {
        givenItemSurvey(401L);
        given(iemRepository.findById(401L)).willReturn(Optional.of(SurveyArticle.builder()
                .srvyArtclSn(401L).srvySn(201L).srvyQstnSn(301L).build()));
        given(rsltRepository.countBySrvyArtclSn(401L)).willReturn(1L);

        assertThatThrownBy(() -> surveyService.deleteItem(401L))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(nuri.foundation.core.exception.CommonErrorCode.RESOURCE_IN_USE);
        verify(rsltRepository, never()).deleteBySrvyArtclSn(anyLong());
        verify(iemRepository, never()).deleteById(anyLong());
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
        givenQuestionSurvey(301L);
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
    @DisplayName("🚨 주관식 문항을 만들면 답변 칸 하나를 함께 만든다 — 칸이 없으면 응답자가 답할 수 없다 (2026-10-27)")
    void insertQuestion_freeTextCreatesAnswerSlot() {
        given(infoRepository.findByIdForSubmission(201L)).willReturn(Optional.of(
                SurveyInfo.builder().srvySn(201L).srvyTmpltSn(101L).build()));
        given(qesitmRepository.save(any(SurveyQuestion.class))).willAnswer(inv -> {
            SurveyQuestion saved = inv.getArgument(0);
            org.springframework.test.util.ReflectionTestUtils.setField(saved, "srvyQstnSn", 501L);
            return saved;
        });

        surveyService.insertQuestion(SurveyQuestionDto.builder().srvySn(201L).qstnTypeCd("2").qstnCn("개선할 점").build());

        org.mockito.ArgumentCaptor<SurveyArticle> captor = org.mockito.ArgumentCaptor.forClass(SurveyArticle.class);
        verify(iemRepository).save(captor.capture());
        assertThat(captor.getValue().getSrvyQstnSn()).isEqualTo(501L);
        assertThat(captor.getValue().getArtclCn()).isEqualTo(SurveyQuestion.FREE_TEXT_ARTICLE_CONTENT);
        assertThat(captor.getValue().getSrvyTmpltSn()).isEqualTo(101L);

        org.mockito.Mockito.clearInvocations(iemRepository);
        surveyService.insertQuestion(SurveyQuestionDto.builder().srvySn(201L).qstnTypeCd("1").qstnCn("만족하십니까").build());
        verify(iemRepository, never()).save(any());
    }

    @Test
    @DisplayName("🚨 유형을 주관식으로 바꾸면 답변 칸이 없을 때 하나 만든다")
    void updateQuestion_toFreeTextCreatesAnswerSlot() {
        givenQuestionSurvey(301L);
        SurveyQuestion question = SurveyQuestion.builder()
                .srvyQstnSn(301L).srvySn(201L).qstnTypeCd("1").qstnCn("질문")
                .qstnSn(2L).maxChcCnt(3).srvyTmpltSn(101L).build();
        given(qesitmRepository.findById(301L)).willReturn(Optional.of(question));
        given(iemRepository.findBySrvyQstnSnOrderByArtclSnAsc(301L)).willReturn(List.of());

        surveyService.updateQuestion(SurveyQuestionDto.builder().srvyQstnSn(301L).srvySn(201L)
                .qstnSn(2L).qstnTypeCd("2").qstnCn("질문").maxChcCnt(3).build());

        assertThat(question.isFreeText()).isTrue();
        assertThat(question.getMaxChcCnt()).isEqualTo(1);
        org.mockito.ArgumentCaptor<SurveyArticle> slot = org.mockito.ArgumentCaptor.forClass(SurveyArticle.class);
        verify(iemRepository).save(slot.capture());
        assertThat(slot.getValue()).extracting("srvySn", "srvyQstnSn", "srvyTmpltSn",
                        "artclSn", "artclCn", "etcAnsYn")
                .containsExactly(201L, 301L, 101L, 1L, SurveyQuestion.FREE_TEXT_ARTICLE_CONTENT, "N");
    }

    @ParameterizedTest
    @ValueSource(ints = {2, 3})
    @DisplayName("선택 항목이 둘 이상인 문항은 주관식으로 바꾸지 않고 400으로 거부하며 문항과 항목을 보존한다")
    void updateQuestion_toFreeTextRejectsMultipleItemsBeforeChangingQuestion(int itemCount) {
        givenQuestionSurvey(301L);
        SurveyQuestion question = SurveyQuestion.builder()
                .srvyQstnSn(301L).srvySn(201L).srvyTmpltSn(101L)
                .qstnSn(2L).qstnTypeCd("1").qstnCn("원래 문항").maxChcCnt(3).build();
        given(qesitmRepository.findById(301L)).willReturn(Optional.of(question));
        List<SurveyArticle> items = java.util.stream.LongStream.rangeClosed(1, itemCount)
                .mapToObj(order -> SurveyArticle.builder().srvyArtclSn(400L + order)
                        .srvySn(201L).srvyQstnSn(301L).srvyTmpltSn(101L)
                        .artclSn(order).artclCn("항목 " + order).etcAnsYn("N").build())
                .toList();
        given(iemRepository.findBySrvyQstnSnOrderByArtclSnAsc(301L)).willReturn(items);

        assertThatThrownBy(() -> surveyService.updateQuestion(SurveyQuestionDto.builder()
                .srvyQstnSn(301L).srvySn(201L).qstnSn(8L).qstnTypeCd("2")
                .qstnCn("변경 요청 문항").maxChcCnt(1).build()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);

        assertThat(question).extracting("srvyQstnSn", "srvySn", "srvyTmpltSn",
                        "qstnSn", "qstnTypeCd", "qstnCn", "maxChcCnt")
                .containsExactly(301L, 201L, 101L, 2L, "1", "원래 문항", 3);
        for (int index = 0; index < itemCount; index++) {
            long order = index + 1L;
            assertThat(items.get(index)).extracting("srvyArtclSn", "srvySn", "srvyQstnSn",
                            "srvyTmpltSn", "artclSn", "artclCn", "etcAnsYn")
                    .containsExactly(400L + order, 201L, 301L, 101L, order, "항목 " + order, "N");
        }
        verify(iemRepository, never()).save(any());
        verify(iemRepository, never()).deleteById(any());
        verify(iemRepository, never()).deleteBySrvyQstnSn(anyLong());
        verify(rsltRepository, never()).deleteBySrvyQstnSn(anyLong());
    }

    @Test
    @DisplayName("선택 항목 하나를 주관식으로 바꾸면 기존 항목을 그대로 쓰고 최대 답변 수는 하나가 된다")
    void updateQuestion_toFreeTextKeepsExistingSlotAndLimitsAnswerCount() {
        givenQuestionSurvey(301L);
        SurveyQuestion question = SurveyQuestion.builder()
                .srvyQstnSn(301L).srvySn(201L).srvyTmpltSn(101L)
                .qstnSn(2L).qstnTypeCd("1").qstnCn("질문").maxChcCnt(3).build();
        SurveyArticle item = SurveyArticle.builder().srvyArtclSn(401L).srvySn(201L)
                .srvyQstnSn(301L).srvyTmpltSn(101L).artclSn(4L).artclCn("기존 항목").etcAnsYn("Y").build();
        given(qesitmRepository.findById(301L)).willReturn(Optional.of(question));
        given(iemRepository.findBySrvyQstnSnOrderByArtclSnAsc(301L)).willReturn(List.of(item));

        surveyService.updateQuestion(SurveyQuestionDto.builder().srvyQstnSn(301L).srvySn(201L)
                .qstnSn(2L).qstnTypeCd("2").qstnCn("질문").maxChcCnt(3).build());

        assertThat(question.isFreeText()).isTrue();
        assertThat(question.getMaxChcCnt()).isEqualTo(1);
        assertThat(item).extracting("srvyArtclSn", "srvySn", "srvyQstnSn", "srvyTmpltSn",
                        "artclSn", "artclCn", "etcAnsYn")
                .containsExactly(401L, 201L, 301L, 101L, 4L, "기존 항목", "Y");
        verify(iemRepository, never()).save(any());
        verify(iemRepository, never()).deleteById(any());
        verify(iemRepository, never()).deleteBySrvyQstnSn(anyLong());
    }

    @Test
    @DisplayName("미응답 주관식을 선택형으로 되돌리면 기존 항목을 보존하고 요청한 선택 수를 쓴다")
    void updateQuestion_fromFreeTextPreservesItemAndRequestedChoiceCount() {
        givenQuestionSurvey(301L);
        SurveyQuestion question = SurveyQuestion.builder()
                .srvyQstnSn(301L).srvySn(201L).srvyTmpltSn(101L)
                .qstnSn(2L).qstnTypeCd("2").qstnCn("질문").maxChcCnt(1).build();
        SurveyArticle item = SurveyArticle.builder().srvyArtclSn(401L).srvySn(201L)
                .srvyQstnSn(301L).srvyTmpltSn(101L).artclSn(1L)
                .artclCn(SurveyQuestion.FREE_TEXT_ARTICLE_CONTENT).etcAnsYn("N").build();
        given(qesitmRepository.findById(301L)).willReturn(Optional.of(question));
        given(iemRepository.findBySrvyQstnSnOrderByArtclSnAsc(301L)).willReturn(List.of(item));

        surveyService.updateQuestion(SurveyQuestionDto.builder().srvyQstnSn(301L).srvySn(201L)
                .qstnSn(2L).qstnTypeCd("1").qstnCn("질문").maxChcCnt(3).build());

        assertThat(question.getQstnTypeCd()).isEqualTo("1");
        assertThat(question.getMaxChcCnt()).isEqualTo(3);
        assertThat(item).extracting("srvyArtclSn", "srvySn", "srvyQstnSn", "srvyTmpltSn",
                        "artclSn", "artclCn", "etcAnsYn")
                .containsExactly(401L, 201L, 301L, 101L, 1L, SurveyQuestion.FREE_TEXT_ARTICLE_CONTENT, "N");
        verify(iemRepository, never()).save(any());
        verify(iemRepository, never()).deleteById(any());
        verify(iemRepository, never()).deleteBySrvyQstnSn(anyLong());
    }

    @ParameterizedTest
    @CsvSource({"1, 2", "2, 1"})
    @DisplayName("응답이 있는 문항은 양방향 유형 전환을 409로 막고 문항과 응답을 보존한다")
    void updateQuestion_answeredTypeConversionPreservesMeaning(String originalType, String requestedType) {
        givenQuestionSurvey(301L);
        SurveyQuestion question = SurveyQuestion.builder()
                .srvyQstnSn(301L).srvySn(201L).srvyTmpltSn(101L)
                .qstnSn(2L).qstnTypeCd(originalType).qstnCn("질문").maxChcCnt(1).build();
        given(qesitmRepository.findById(301L)).willReturn(Optional.of(question));
        given(rsltRepository.countBySrvyQstnSn(301L)).willReturn(3L);

        // 선택 항목이 둘 이상이어도 응답된 문항의 의미 보호(409)가 전환 형상 검사(400)보다 먼저다.
        given(iemRepository.findBySrvyQstnSnOrderByArtclSnAsc(301L)).willReturn(List.of(
                SurveyArticle.builder().srvyArtclSn(401L).srvySn(201L).srvyQstnSn(301L).build(),
                SurveyArticle.builder().srvyArtclSn(402L).srvySn(201L).srvyQstnSn(301L).build()));

        assertThatThrownBy(() -> surveyService.updateQuestion(SurveyQuestionDto.builder()
                .srvyQstnSn(301L).srvySn(201L).qstnSn(8L).qstnTypeCd(requestedType)
                .qstnCn("질문").maxChcCnt(1).build()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.RESOURCE_IN_USE);

        assertThat(question).extracting("srvyQstnSn", "srvySn", "srvyTmpltSn",
                        "qstnSn", "qstnTypeCd", "qstnCn", "maxChcCnt")
                .containsExactly(301L, 201L, 101L, 2L, originalType, "질문", 1);
        verify(iemRepository, never()).save(any());
        verify(iemRepository, never()).deleteBySrvyQstnSn(anyLong());
        verify(rsltRepository, never()).deleteBySrvyQstnSn(anyLong());
        verify(rsltRepository, never()).save(any());
    }

    @ParameterizedTest
    @CsvSource({"1, 3", "3, 1"})
    @DisplayName("응답된 주관식의 최대 선택 수 변경은 정규화를 이유로 허용하지 않고 409로 거부한다")
    void updateQuestion_answeredFreeTextChoiceCountChangePreservesMeaning(int originalMax, int requestedMax) {
        givenQuestionSurvey(301L);
        SurveyQuestion question = SurveyQuestion.builder()
                .srvyQstnSn(301L).srvySn(201L).srvyTmpltSn(101L)
                .qstnSn(2L).qstnTypeCd("2").qstnCn("질문").maxChcCnt(originalMax).build();
        given(qesitmRepository.findById(301L)).willReturn(Optional.of(question));
        given(rsltRepository.countBySrvyQstnSn(301L)).willReturn(3L);

        assertThatThrownBy(() -> surveyService.updateQuestion(SurveyQuestionDto.builder()
                .srvyQstnSn(301L).srvySn(201L).qstnSn(8L).qstnTypeCd("2")
                .qstnCn("질문").maxChcCnt(requestedMax).build()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.RESOURCE_IN_USE);

        assertThat(question).extracting("qstnSn", "qstnTypeCd", "qstnCn", "maxChcCnt")
                .containsExactly(2L, "2", "질문", originalMax);
        verify(iemRepository, never()).save(any());
        verify(rsltRepository, never()).deleteBySrvyQstnSn(anyLong());
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 3})
    @DisplayName("응답된 주관식의 순번만 바꾸면 과거 최대 선택 수를 조용히 정규화하지 않는다")
    void updateQuestion_answeredFreeTextOrderOnlyPreservesLegacyChoiceCount(int originalMax) {
        givenQuestionSurvey(301L);
        SurveyQuestion question = SurveyQuestion.builder()
                .srvyQstnSn(301L).srvySn(201L).srvyTmpltSn(101L)
                .qstnSn(2L).qstnTypeCd("2").qstnCn("질문").maxChcCnt(originalMax).build();
        SurveyArticle item = SurveyArticle.builder().srvyArtclSn(401L).srvySn(201L)
                .srvyQstnSn(301L).srvyTmpltSn(101L).artclSn(1L).artclCn("기존 답변 칸").etcAnsYn("N").build();
        given(qesitmRepository.findById(301L)).willReturn(Optional.of(question));
        given(iemRepository.findBySrvyQstnSnOrderByArtclSnAsc(301L)).willReturn(List.of(item));
        given(rsltRepository.countBySrvyQstnSn(301L)).willReturn(3L);

        surveyService.updateQuestion(SurveyQuestionDto.builder().srvyQstnSn(301L).srvySn(201L)
                .qstnSn(8L).qstnTypeCd("2").qstnCn("질문").maxChcCnt(originalMax).build());

        assertThat(question).extracting("srvyQstnSn", "srvySn", "srvyTmpltSn",
                        "qstnSn", "qstnTypeCd", "qstnCn", "maxChcCnt")
                .containsExactly(301L, 201L, 101L, 8L, "2", "질문", originalMax);
        assertThat(item.getArtclCn()).isEqualTo("기존 답변 칸");
        verify(iemRepository, never()).save(any());
        verify(iemRepository, never()).deleteBySrvyQstnSn(anyLong());
        verify(rsltRepository, never()).deleteBySrvyQstnSn(anyLong());
    }

    @Test
    @DisplayName("🚨 주관식 문항의 답변 칸은 하나다 — 더 만들거나 마지막 칸을 지우면 400")
    void freeTextAnswerSlotIsExactlyOne() {
        givenQuestionSurvey(301L);
        SurveyQuestion freeText = SurveyQuestion.builder().srvyQstnSn(301L).srvySn(201L).qstnTypeCd("2").srvyTmpltSn(101L).build();
        SurveyArticle slot = SurveyArticle.builder().srvyArtclSn(401L).srvySn(201L).srvyQstnSn(301L).build();
        given(qesitmRepository.findById(301L)).willReturn(Optional.of(freeText));
        given(iemRepository.findBySrvyQstnSnOrderByArtclSnAsc(301L)).willReturn(List.of(slot));

        assertThatThrownBy(() -> surveyService.insertItem(SurveyArticleDto.builder().srvyQstnSn(301L).artclCn("둘째 칸").build()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("답변 칸이 하나만");

        givenItemSurvey(401L);
        given(iemRepository.findById(401L)).willReturn(Optional.of(slot));
        assertThatThrownBy(() -> surveyService.deleteItem(401L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("답변 칸은 지울 수 없습니다");
        verify(iemRepository, never()).save(any());
        verify(iemRepository, never()).deleteById(any());
    }

    @Test
    @DisplayName("설문 항목 수정 - 성공")
    void updateItem_Success() {
        SurveyArticle item = SurveyArticle.builder()
                .srvyArtclSn(401L)
                .srvySn(201L)
                .artclCn("OLD")
                .build();
        given(iemRepository.findById(401L)).willReturn(Optional.of(item));
        givenItemSurvey(401L);

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
        given(infoRepository.findSurveyIdByArticleId(401L)).willReturn(Optional.empty());

        SurveyArticleDto dto = SurveyArticleDto.builder().srvyArtclSn(401L).build();

        assertThatThrownBy(() -> surveyService.updateItem(dto))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("설문 항목 삭제 - 성공")
    void deleteItem_Success() {
        givenItemSurvey(401L);
        given(iemRepository.findById(401L)).willReturn(Optional.of(SurveyArticle.builder()
                .srvyArtclSn(401L).srvySn(201L).srvyQstnSn(301L).build()));
        surveyService.deleteItem(401L);
        verify(iemRepository, times(1)).deleteById(401L);
    }

    @Test
    @DisplayName("[DIP B5 F6] 설문 복제는 요청의 제목·기간으로 새 설문을 만들고 문항·선택 항목을 새 번호로 옮긴다 — 응답은 옮기지 않는다")
    void copySurvey_copiesQuestionsAndItemsWithRequestedTitleAndPeriod() {
        SurveyInfo source = SurveyInfo.builder().srvySn(10L).srvyTtl("원본").srvyPrps("목적").srvyWrtGdCn("안내")
                .srvyBgngYmd("20260901").srvyEndYmd("20260930").srvyTrgt("전 직원").srvyTmpltSn(3L).build();
        given(infoRepository.findByIdForSubmission(10L)).willReturn(Optional.of(source));
        given(infoRepository.save(any(SurveyInfo.class))).willAnswer(inv -> {
            SurveyInfo saved = inv.getArgument(0);
            org.springframework.test.util.ReflectionTestUtils.setField(saved, "srvySn", 20L);
            return saved;
        });
        SurveyQuestion q1 = SurveyQuestion.builder().srvyQstnSn(101L).srvySn(10L).qstnSn(1L).qstnTypeCd("1").qstnCn("만족하십니까").maxChcCnt(1).srvyTmpltSn(3L).build();
        SurveyQuestion q2 = SurveyQuestion.builder().srvyQstnSn(102L).srvySn(10L).qstnSn(2L).qstnTypeCd("2").qstnCn("복수").maxChcCnt(2).srvyTmpltSn(3L).build();
        given(qesitmRepository.findBySrvySnOrderByQstnSnAsc(10L)).willReturn(List.of(q1, q2));
        java.util.concurrent.atomic.AtomicLong questionSerial = new java.util.concurrent.atomic.AtomicLong(200L);
        given(qesitmRepository.save(any(SurveyQuestion.class))).willAnswer(inv -> {
            SurveyQuestion saved = inv.getArgument(0);
            org.springframework.test.util.ReflectionTestUtils.setField(saved, "srvyQstnSn", questionSerial.incrementAndGet());
            return saved;
        });
        given(iemRepository.findBySrvyQstnSnInOrderBySrvyQstnSnAscArtclSnAsc(any())).willReturn(List.of(
                SurveyArticle.builder().srvyArtclSn(501L).srvyQstnSn(101L).srvySn(10L).artclSn(1L).artclCn("예").etcAnsYn("N").srvyTmpltSn(3L).build(),
                SurveyArticle.builder().srvyArtclSn(502L).srvyQstnSn(102L).srvySn(10L).artclSn(1L).artclCn("기타").etcAnsYn("Y").srvyTmpltSn(3L).build()));

        Long copySn = surveyService.copySurvey(10L, nuri.business.service.survey.dto.SurveyCopyRequest.builder()
                .srvyTtl("  2차 조사 ").srvyBgngYmd("20261001").srvyEndYmd("20261031").build());

        assertThat(copySn).isEqualTo(20L);
        org.mockito.ArgumentCaptor<SurveyInfo> info = org.mockito.ArgumentCaptor.forClass(SurveyInfo.class);
        verify(infoRepository).save(info.capture());
        assertThat(info.getValue().getSrvyTtl()).isEqualTo("2차 조사");
        assertThat(info.getValue().getSrvyBgngYmd()).isEqualTo("20261001");
        assertThat(info.getValue().getSrvyEndYmd()).isEqualTo("20261031");
        assertThat(info.getValue().getSrvyPrps()).isEqualTo("목적");
        assertThat(info.getValue().getSrvyTmpltSn()).isEqualTo(3L);

        org.mockito.ArgumentCaptor<SurveyQuestion> questions = org.mockito.ArgumentCaptor.forClass(SurveyQuestion.class);
        verify(qesitmRepository, times(2)).save(questions.capture());
        assertThat(questions.getAllValues()).extracting(SurveyQuestion::getSrvySn).containsOnly(20L);
        assertThat(questions.getAllValues()).extracting(SurveyQuestion::getQstnCn).containsExactly("만족하십니까", "복수");
        assertThat(questions.getAllValues()).extracting(SurveyQuestion::getMaxChcCnt).containsExactly(1, 2);

        org.mockito.ArgumentCaptor<SurveyArticle> items = org.mockito.ArgumentCaptor.forClass(SurveyArticle.class);
        verify(iemRepository, times(2)).save(items.capture());
        // 선택 항목은 원본 문항이 아니라 사본 문항(201·202)에 붙는다.
        assertThat(items.getAllValues()).extracting(SurveyArticle::getSrvyQstnSn).containsExactly(201L, 202L);
        assertThat(items.getAllValues()).extracting(SurveyArticle::getSrvySn).containsOnly(20L);
        assertThat(items.getAllValues()).extracting(SurveyArticle::getEtcAnsYn).containsExactly("N", "Y");
        verifyNoInteractions(rsltRepository, rspdntRepository);
    }

    @Test
    @DisplayName("[DIP B5 F6] 없는 설문은 404, 시작일이 종료일보다 늦은 사본 기간은 400 이고 아무것도 만들지 않는다")
    void copySurvey_rejectsMissingSourceOrReversedPeriod() {
        given(infoRepository.findByIdForSubmission(99L)).willReturn(Optional.empty());
        assertThatThrownBy(() -> surveyService.copySurvey(99L, nuri.business.service.survey.dto.SurveyCopyRequest.builder()
                .srvyTtl("사본").srvyBgngYmd("20261001").srvyEndYmd("20261031").build()))
                .isInstanceOf(BusinessException.class);

        given(infoRepository.findByIdForSubmission(10L)).willReturn(Optional.of(SurveyInfo.builder().srvySn(10L).srvyTtl("원본").srvyTmpltSn(3L).build()));
        assertThatThrownBy(() -> surveyService.copySurvey(10L, nuri.business.service.survey.dto.SurveyCopyRequest.builder()
                .srvyTtl("사본").srvyBgngYmd("20261031").srvyEndYmd("20261001").build()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("시작일");
        verify(infoRepository, never()).save(any(SurveyInfo.class));
    }

    private void givenQuestionSurvey(Long questionId) {
        given(infoRepository.findSurveyIdByQuestionId(questionId)).willReturn(Optional.of(201L));
        given(infoRepository.findByIdForSubmission(201L)).willReturn(Optional.of(SurveyInfo.builder().srvySn(201L).build()));
    }

    private void givenItemSurvey(Long articleId) {
        given(infoRepository.findSurveyIdByArticleId(articleId)).willReturn(Optional.of(201L));
        given(infoRepository.findByIdForSubmission(201L)).willReturn(Optional.of(SurveyInfo.builder().srvySn(201L).build()));
    }
}
