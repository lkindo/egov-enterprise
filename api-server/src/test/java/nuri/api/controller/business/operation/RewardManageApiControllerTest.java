package nuri.api.controller.business.operation;
import static org.mockito.Mockito.never;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.mockito.Mockito.verify;
import static org.mockito.ArgumentMatchers.eq;

import nuri.business.security.annotation.WithMockCustomUser;
import nuri.business.service.operation.RewardManageService;
import nuri.business.service.operation.dto.RewardManageDto;
import nuri.business.support.ControllerTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
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
    @DisplayName("포상을 등록한다")
    void createReward_succeeds() throws Exception {
        given(rewardManageService.createReward(any(RewardManageDto.class))).willReturn(new RewardManageDto());

        mockMvc.perform(post("/api/v1/admin/operation/rewards")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rwardNm\":\"모범 사원상\",\"rwardwnrId\":\"U1\",\"rwardCode\":\"R01\"}")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
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
}
