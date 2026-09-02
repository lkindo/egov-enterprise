package nuri.api.controller.foundation.controller.system.service.survey;

import nuri.business.security.annotation.WithMockCustomUser;
import nuri.business.service.survey.SurveyResultService;
import nuri.business.service.survey.dto.SurveyResponseSubmitDto;
import nuri.business.service.survey.dto.SurveyStatsDto;
import nuri.business.support.ControllerTestSupport;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.annotation.Authenticated;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 설문 응답 제출·통계 API 검증 — 컨트롤러 테스트가 <b>하나도 없던</b> 엔드포인트다.
 *
 * <p>인가 축이 이 도메인의 핵심이다. DEC-OPS-010 은 설문 <b>열람·제출을 인증 사용자에게
 * 개방</b>하고 관리 뮤테이션만 ADMIN/SYSTEM 으로 좁히기로 결정했다. 종전에는 컨트롤러에
 * 메서드 인가가 없어 URL 게이트 한 겹에만 의존했고, 제출 엔드포인트가 핸들러에 닿기도 전에
 * 403 으로 죽어 애노테이션의 의미와 실행 의미가 어긋나 있었다(GAP-AUTH-001).
 * 그 결정이 코드에서 유지되는지를 고정한다.
 */
@WebMvcTest(SurveySubmissionApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("SurveySubmissionApiController 테스트")
class SurveySubmissionApiControllerTest extends ControllerTestSupport {

    @MockitoBean
    private SurveyResultService surveyResultService;

    private static final String VALID_SUBMISSION = """
            {"answers":[{"srvyQstnSn":1,"srvyArtclSn":2,"rspdntAnsCn":"매우 만족"}]}
            """;

    @Test
    @WithMockCustomUser(username = "user01", esntlId = "user01")
    @DisplayName("일반 인증 사용자가 설문 통계를 조회한다")
    void getStats_openToAuthenticatedUser() throws Exception {
        given(surveyResultService.getStats(anyLong())).willReturn(List.of());

        mockMvc.perform(get("/api/v1/surveys/7/stats").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @WithMockCustomUser(username = "user01", esntlId = "user01")
    @DisplayName("응답을 제출하면 저장된 답변 수를 돌려준다")
    void submit_returnsSavedAnswerCount() throws Exception {
        given(surveyResultService.submitResponse(anyLong(), any(SurveyResponseSubmitDto.class))).willReturn(3);

        mockMvc.perform(post("/api/v1/surveys/7/responses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_SUBMISSION)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value(3));
    }

    /**
     * 답변이 하나도 없는 제출은 서비스에 도달하면 안 된다 — 응답 행 0개짜리 참여 기록이 생겨
     * 통계의 분모만 늘리고 분자는 늘리지 않는다.
     */
    @Test
    @WithMockCustomUser(username = "user01", esntlId = "user01")
    @DisplayName("빈 답변 제출은 서비스에 도달하지 않는다")
    void submit_rejectsEmptyAnswers() throws Exception {
        mockMvc.perform(post("/api/v1/surveys/7/responses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"answers\":[]}")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());

        verify(surveyResultService, never()).submitResponse(anyLong(), any());
    }

    /**
     * 중복 제출 거부는 서비스가 판정한다(fast-path + 유니크 제약 위반 변환). 컨트롤러가 그
     * 실패를 삼켜 200 으로 바꾸면 사용자는 두 번째 제출이 반영됐다고 믿는다.
     */
    @Test
    @WithMockCustomUser(username = "user01", esntlId = "user01")
    @DisplayName("중복 제출 거부가 성공으로 번역되지 않는다")
    void submit_propagatesDuplicateRejection() throws Exception {
        given(surveyResultService.submitResponse(anyLong(), any(SurveyResponseSubmitDto.class)))
                .willThrow(new BusinessException("이미 응답한 설문입니다.", CommonErrorCode.INVALID_INPUT_VALUE));

        mockMvc.perform(post("/api/v1/surveys/7/responses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_SUBMISSION)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    /**
     * DEC-OPS-010 의 결정을 코드에 고정한다. {@code @Authenticated} 가 {@code @AdminOrSystem}
     * 으로 바뀌면 <b>일반 사용자가 설문에 응답할 수 없게 된다</b> — 설문은 일반 사용자가
     * 응답하는 제품이므로 그 변경은 제품 의도를 뒤집는다.
     */
    @Test
    @DisplayName("열람·제출은 인증 사용자에게 열려 있다 — 관리자 전용으로 좁히지 않는다")
    void readAndSubmitStayOpenToAuthenticatedUsers() throws NoSuchMethodException {
        var stats = SurveySubmissionApiController.class.getMethod("getStats", Long.class);
        var submit = SurveySubmissionApiController.class.getMethod(
                "submit", Long.class, SurveyResponseSubmitDto.class);

        assertThat(stats.isAnnotationPresent(Authenticated.class)).isTrue();
        assertThat(submit.isAnnotationPresent(Authenticated.class)).isTrue();
        assertThat(stats.isAnnotationPresent(nuri.foundation.security.annotation.AdminOrSystem.class))
                .as("관리자 전용으로 좁히면 일반 사용자가 설문 결과를 볼 수 없다")
                .isFalse();
        assertThat(submit.isAnnotationPresent(nuri.foundation.security.annotation.AdminOrSystem.class))
                .as("관리자 전용으로 좁히면 일반 사용자가 설문에 응답할 수 없다")
                .isFalse();
    }

    /** 통계 응답이 배열 계약을 유지하는지 — 소비 화면이 map 을 기대하도록 바뀌면 red 다. */
    @Test
    @WithMockCustomUser(username = "user01", esntlId = "user01")
    @DisplayName("통계는 문항×항목 평면 배열로 응답한다")
    void getStats_returnsFlatArray() throws Exception {
        given(surveyResultService.getStats(anyLong()))
                .willReturn(List.of(SurveyStatsDto.builder().build()));

        mockMvc.perform(get("/api/v1/surveys/7/stats").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data.length()").value(1));
    }
}
