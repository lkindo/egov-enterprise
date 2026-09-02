package nuri.api.controller.foundation.controller.system.service.survey;

import nuri.business.service.survey.SurveyRespondentService;
import nuri.business.service.survey.dto.SurveyRespondentDto;
import nuri.foundation.core.annotation.PrivacyAccess;
import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.foundation.security.annotation.AdminOnly;
import nuri.foundation.security.annotation.AdminOrSystem;
import nuri.foundation.security.annotation.Authenticated;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.lang.reflect.Method;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("SurveyRespondentApiController 테스트")
class SurveyRespondentApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private SurveyRespondentService surveyRespondentService;

    @InjectMocks
    private SurveyRespondentApiController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                // standalone 은 Pageable 해석기를 자동 등록하지 않는다 — 없으면 @PageableDefault 핸들러가 500 이다.
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    /**
     * 🔒 <b>핸들러 5개 전부가 {@code @AdminOnly} 여야 한다 — 하나라도 새면 개인정보가 샌다.</b>
     *
     * <p>응답자 레코드는 성별·생년월일·전화번호를 담는다. standalone MockMvc 는
     * {@code @PreAuthorize} 를 강제하지 않으므로, 누군가 "다른 설문 API 와 통일하자" 며
     * 애노테이션을 넓히거나 지워도 아래 기능 테스트는 전부 초록이다. 그래서 리플렉션으로
     * <b>전수</b> 단언한다 — 메서드 하나만 검사하면 나머지 넷의 완화를 놓친다.
     */
    @Test
    @DisplayName("🔒 응답자 API 핸들러 5종 전부 @AdminOnly — 완화(@AdminOrSystem/@Authenticated) 차단")
    void everyHandlerMustBeAdminOnly() {
        Method[] handlers = SurveyRespondentApiController.class.getDeclaredMethods();
        List<Method> mapped = List.of(handlers).stream()
                .filter(m -> m.getAnnotations().length > 0)
                .filter(m -> java.util.Arrays.stream(m.getAnnotations())
                        .anyMatch(a -> a.annotationType().getName().startsWith("org.springframework.web.bind")))
                .toList();

        assertThat(mapped)
                .as("매핑 핸들러가 5개여야 한다 — 새 엔드포인트가 늘면 이 단언이 먼저 깨져 검토를 강제한다")
                .hasSize(5);

        for (Method m : mapped) {
            assertThat(m.isAnnotationPresent(AdminOnly.class))
                    .as("%s 에 @AdminOnly 가 없다 — 응답자 개인정보(성별·생년월일·전화번호)가 노출된다", m.getName())
                    .isTrue();
            assertThat(m.isAnnotationPresent(AdminOrSystem.class))
                    .as("%s: @AdminOrSystem 은 SYSTEM 롤을 통과시킨다 — 참여자 신상에는 넓다", m.getName())
                    .isFalse();
            assertThat(m.isAnnotationPresent(Authenticated.class))
                    .as("%s: @Authenticated 는 인증만 보므로 일반 사용자에게 열린다", m.getName())
                    .isFalse();
        }
    }

    @Test
    @DisplayName("응답자 목록·상세 GET은 개인정보 접근 증적을 선언")
    void readHandlersDeclarePrivacyAccess() throws NoSuchMethodException {
        PrivacyAccess list = SurveyRespondentApiController.class
                .getDeclaredMethod("getRespondents", Long.class, String.class, Pageable.class)
                .getAnnotation(PrivacyAccess.class);
        PrivacyAccess detail = SurveyRespondentApiController.class
                .getDeclaredMethod("getRespondent", Long.class, String.class)
                .getAnnotation(PrivacyAccess.class);

        assertThat(list).isNotNull();
        assertThat(list.value()).isNotBlank();
        assertThat(detail).isNotNull();
        assertThat(detail.value()).isNotBlank();
    }

    @Test
    @DisplayName("응답자 목록 조회 — 경로의 srvySn 이 서비스까지 전달된다")
    void listPassesSrvySnToService() throws Exception {
        SurveyRespondentDto dto = SurveyRespondentDto.builder()
                .srvyRspdntId("SRES_0000000000001")
                .srvySn(201L)
                .rspdntNm("홍길동")
                .gndrCd("M")
                .build();
        when(surveyRespondentService.getSurveyRespondentList(anyLong(), any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(dto), PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/api/v1/admin/system/surveys/201/respondents").param("keyword", "홍"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list[0].rspdntNm").value("홍길동"));

        // srvySn 이 유실되면 전체 설문의 응답자가 섞인다 — 1단계에서 고친 결함의 회귀 가드다.
        verify(surveyRespondentService).getSurveyRespondentList(eq(201L), eq("홍"), any(Pageable.class));
    }

    /** 본문이 다른 설문을 가리켜도 경로가 이긴다 — 경로 범위를 우회한 교차 등록을 막는다. */
    @Test
    @DisplayName("등록 시 경로의 srvySn 이 본문 값을 덮어쓴다 — 교차 설문 등록 차단")
    void createOverridesBodySrvySnWithPathVariable() throws Exception {
        when(surveyRespondentService.createSurveyRespondent(anyString(), any()))
                .thenReturn("SRES_0000000000009");

        mockMvc.perform(post("/api/v1/admin/system/surveys/201/respondents")
                        .contentType("application/json")
                        .content("{\"srvySn\":999,\"rspdntNm\":\"홍길동\"}"))
                .andExpect(status().isOk());

        ArgumentCaptor<SurveyRespondentDto> captor = ArgumentCaptor.forClass(SurveyRespondentDto.class);
        verify(surveyRespondentService).createSurveyRespondent(anyString(), captor.capture());
        assertThat(captor.getValue().getSrvySn())
                .as("본문의 999가 아니라 경로의 201이 쓰여야 한다")
                .isEqualTo(201L);
    }
}
