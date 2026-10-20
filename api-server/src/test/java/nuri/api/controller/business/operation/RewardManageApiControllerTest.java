package nuri.api.controller.business.operation;
import static org.mockito.Mockito.never;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.mockito.Mockito.verify;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;

import nuri.business.security.annotation.WithMockCustomUser;
import nuri.business.service.reward.RewardManageService;
import nuri.business.service.reward.dto.RewardManageDto;
import nuri.business.support.ControllerTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 외부인사 API 검증 — 컨트롤러 테스트가 <b>하나도 없던</b> 엔드포인트다.
 *
 * <p>이 응답에는 성명·생년월일·전화번호·이메일이 실린다. 즉 <b>타인의 개인정보</b>이며,
 * 그 애노테이션이 사라지면 개인정보가 <b>증적 없이</b> 조회되므로 존재를 계약으로 고정한다.
 */
@WebMvcTest(RewardManageApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("RewardManageApiController 테스트")
class RewardManageApiControllerTest extends ControllerTestSupport {

    @MockitoBean
    private RewardManageService rewardManageService;

    @Test
    @WithMockCustomUser(username = "admin", esntlId = "admin", role = "ADMIN")
    @DisplayName("포상 목록 조회는 이름 검색어를 그대로, 없으면 null 로 서비스에 전달한다")
    void getRewardList_passesNameFilter() throws Exception {
        given(rewardManageService.getRewardList(any(), any(Pageable.class))).willReturn(new PageImpl<>(List.of()));

        mockMvc.perform(get("/api/v1/admin/operation/rewards").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/admin/operation/rewards").param("name", "Award").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        verify(rewardManageService).getRewardList(isNull(), any(Pageable.class));
        verify(rewardManageService).getRewardList(eq("Award"), any(Pageable.class));
    }

    @Test
    @WithMockCustomUser(username = "admin", esntlId = "admin", role = "ADMIN")
    @DisplayName("포상을 등록한다")
    void createReward_succeeds() throws Exception {
        given(rewardManageService.createReward(any(RewardManageDto.class))).willReturn(new RewardManageDto());

        mockMvc.perform(post("/api/v1/admin/operation/rewards")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rwardNm\":\"모범 사원상\",\"rwardwnrId\":\"U1\",\"rwardCode\":\"R01\"}")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true));
    }

    // [2026-09-05 DEC-OPS-036] 수정·삭제 경로 — 종전에는 GET·POST 뿐이었다.
    @Test
    @WithMockCustomUser(username = "admin", esntlId = "admin", role = "ADMIN")
    @DisplayName("포상을 수정한다")
    void updateReward_succeeds() throws Exception {
        given(rewardManageService.updateReward(eq(7L), any(RewardManageDto.class))).willReturn(new RewardManageDto());

        mockMvc.perform(put("/api/v1/admin/operation/rewards/7")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rwardNm\":\"이름 정정\",\"rwardwnrId\":\"U1\",\"rwardCode\":\"R01\"}")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(rewardManageService).updateReward(eq(7L), any(RewardManageDto.class));
    }

    @Test
    @WithMockCustomUser(username = "admin", esntlId = "admin", role = "ADMIN")
    @DisplayName("포상을 삭제한다")
    void deleteReward_succeeds() throws Exception {
        mockMvc.perform(delete("/api/v1/admin/operation/rewards/7").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(rewardManageService).deleteReward(7L);
    }

    @Test
    @WithMockCustomUser(username = "admin", esntlId = "admin", role = "ADMIN")
    @DisplayName("물리 컬럼 폭을 넘는 값(포상 코드 13자)은 서비스에 닿기 전에 400 이다")
    void updateReward_rejectsOverlongCode() throws Exception {
        mockMvc.perform(put("/api/v1/admin/operation/rewards/7")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rwardNm\":\"x\",\"rwardwnrId\":\"U1\",\"rwardCode\":\"1234567890123\"}")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());

        verify(rewardManageService, never()).updateReward(anyLong(), any(RewardManageDto.class));
    }

    /**
     * [2026-10-18] 수상자·포상 코드는 물리 컬럼이 NOT NULL 이고 포상 일자는 yyyyMMdd 달력 날짜다. 종전에는 길이만 검사해
     * 빈 값이나 없는 날짜(2월 30일)가 저장 단계까지 갔다. 등록·수정 모두 서비스에 닿기 전에 400 이다.
     */
    @Test
    @WithMockCustomUser(username = "admin", esntlId = "admin", role = "ADMIN")
    @DisplayName("수상자·포상 코드가 비었거나 포상 일자가 달력 날짜가 아니면 서비스에 닿기 전에 400 이다")
    void createAndUpdateReward_rejectBlankRequiredFieldsAndInvalidDate() throws Exception {
        java.util.Map<String, String> bodies = java.util.Map.of(
                "rwardwnrId", "{\"rwardNm\":\"x\",\"rwardwnrId\":\" \",\"rwardCode\":\"R01\"}",
                "rwardCode", "{\"rwardNm\":\"x\",\"rwardwnrId\":\"U1\"}",
                "rwardDe", "{\"rwardNm\":\"x\",\"rwardwnrId\":\"U1\",\"rwardCode\":\"R01\",\"rwardDe\":\"20260230\"}");
        for (var body : bodies.entrySet()) {
            mockMvc.perform(post("/api/v1/admin/operation/rewards")
                            .contentType(MediaType.APPLICATION_JSON).content(body.getValue()).accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors[0].field").value(body.getKey()));
            mockMvc.perform(put("/api/v1/admin/operation/rewards/7")
                            .contentType(MediaType.APPLICATION_JSON).content(body.getValue()).accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isBadRequest());
        }

        verify(rewardManageService, never()).createReward(any(RewardManageDto.class));
        verify(rewardManageService, never()).updateReward(anyLong(), any(RewardManageDto.class));
    }

    /**
     * [2026-10-20] 수상자 계정이 없거나 사용 중이 아니면 서비스가 거부한다 — 응답은 400 이고 화면이 그대로 보일 문구를 싣는다.
     */
    @Test
    @WithMockCustomUser(username = "admin", esntlId = "admin", role = "ADMIN")
    @DisplayName("없거나 사용 중이 아닌 수상자의 등록·수정은 400 과 다음 행동을 적은 문구로 거부된다")
    void createAndUpdateReward_rejectUnassignableAwardeeWith400() throws Exception {
        String inactive = "수상자가 사용 중인 계정이 아닙니다. 사용 중인 사용자를 수상자로 선택해 주세요.";
        given(rewardManageService.createReward(any(RewardManageDto.class))).willThrow(
                new nuri.foundation.core.exception.BusinessException(
                        nuri.foundation.core.exception.CommonErrorCode.INVALID_INPUT_VALUE, inactive));
        given(rewardManageService.updateReward(eq(7L), any(RewardManageDto.class))).willThrow(
                new nuri.foundation.core.exception.BusinessException(
                        nuri.foundation.core.exception.CommonErrorCode.INVALID_INPUT_VALUE, inactive));
        String body = "{\"rwardNm\":\"x\",\"rwardwnrId\":\"RETIRED\",\"rwardCode\":\"R01\",\"version\":0}";

        mockMvc.perform(post("/api/v1/admin/operation/rewards")
                        .contentType(MediaType.APPLICATION_JSON).content(body).accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(inactive));
        mockMvc.perform(put("/api/v1/admin/operation/rewards/7")
                        .contentType(MediaType.APPLICATION_JSON).content(body).accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(inactive));
    }

    /** [2026-10-20] 수상자 이름·부서는 응답 전용이다 — 목록이 싣고, 요청에 실어 보내도 서비스에 닿지 않는다. */
    @Test
    @WithMockCustomUser(username = "admin", esntlId = "admin", role = "ADMIN")
    @DisplayName("목록은 수상자 이름·부서를 싣고, 요청의 수상자 이름·부서는 바인딩하지 않는다")
    void awardeeNameAndDepartmentAreResponseOnly() throws Exception {
        RewardManageDto row = RewardManageDto.builder().rwrdSn(1L).rwardwnrId("U1").rwardwnrNm("홍길동")
                .rwardwnrDeptNm("총무과").rwardNm("모범 사원상").build();
        given(rewardManageService.getRewardList(any(), any(Pageable.class))).willReturn(new PageImpl<>(List.of(row)));
        given(rewardManageService.createReward(any(RewardManageDto.class))).willReturn(new RewardManageDto());

        mockMvc.perform(get("/api/v1/admin/operation/rewards").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list[0].rwardwnrId").value("U1"))
                .andExpect(jsonPath("$.data.list[0].rwardwnrNm").value("홍길동"))
                .andExpect(jsonPath("$.data.list[0].rwardwnrDeptNm").value("총무과"));

        mockMvc.perform(post("/api/v1/admin/operation/rewards")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rwardNm\":\"x\",\"rwardwnrId\":\"U1\",\"rwardCode\":\"R01\","
                                + "\"rwardwnrNm\":\"위조\",\"rwardwnrDeptNm\":\"위조\"}")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isCreated());
        org.mockito.ArgumentCaptor<RewardManageDto> sent = org.mockito.ArgumentCaptor.forClass(RewardManageDto.class);
        verify(rewardManageService).createReward(sent.capture());
        org.assertj.core.api.Assertions.assertThat(sent.getValue().getRwardwnrNm()).isNull();
        org.assertj.core.api.Assertions.assertThat(sent.getValue().getRwardwnrDeptNm()).isNull();
    }
}
