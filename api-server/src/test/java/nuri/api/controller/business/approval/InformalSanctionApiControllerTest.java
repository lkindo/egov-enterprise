package nuri.api.controller.business.approval;

import nuri.business.service.informalsanction.InformalSanctionService;
import nuri.business.service.informalsanction.dto.InformalSanctionDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import nuri.business.security.annotation.WithMockCustomUser;


import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import nuri.business.support.ControllerTestSupport;

@WebMvcTest(InformalSanctionApiController.class)
@DisplayName("InformalSanctionApiController 테스트")
class InformalSanctionApiControllerTest extends ControllerTestSupport {

    @MockitoBean(name = "informalSanctionService")
    private InformalSanctionService informalSanctionService;

    @Test
    @DisplayName("비정형 결재 목록 조회 테스트")
    @WithMockCustomUser(username = "user01", esntlId = "user01")
    void getInformalSanctionListTest() throws Exception {
        org.mockito.BDDMockito.given(informalSanctionService.getInformalSanctionList(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any())).willReturn(new org.springframework.data.domain.PageImpl<>(java.util.Collections.emptyList()));
        mockMvc.perform(get("/api/v1/informal-sanctions"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("수신한 비정형 결재 목록 조회 테스트")
    @WithMockCustomUser(username = "user01", esntlId = "user01")
    void getReceivedInformalSanctionListTest() throws Exception {
        org.mockito.BDDMockito.given(informalSanctionService.getReceivedInformalSanctionList(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any())).willReturn(new org.springframework.data.domain.PageImpl<>(java.util.Collections.emptyList()));
        mockMvc.perform(get("/api/v1/informal-sanctions").param("type", "received"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("비정형 결재 상세 조회 테스트")
    @WithMockCustomUser(username = "user01", esntlId = "user01")
    void getInformalSanctionTest() throws Exception {
        given(informalSanctionService.getInformalSanction(1L, "user01"))
                .willReturn(InformalSanctionDto.builder().ifmlAtrzSn(1L).build());

        mockMvc.perform(get("/api/v1/informal-sanctions/1"))
                .andExpect(status().isOk());

        verify(informalSanctionService).getInformalSanction(1L, "user01");
    }

    @Test
    @DisplayName("비정형 결재 등록 테스트")
    @WithMockCustomUser(username = "user01", esntlId = "user01")
    void registerInformalSanctionTest() throws Exception {
        // 결재 PK는 DB identity가 생성하고 서비스가 숫자 일련번호를 반환한다.
        given(informalSanctionService.registerInformalSanction(org.mockito.ArgumentMatchers.any())).willReturn(1L);

        InformalSanctionDto dto = InformalSanctionDto.builder()
                .taskSeCd("001")
                .aplcntId("user01")
                .aprvrId("boss01")
                .build();

        mockMvc.perform(post("/api/v1/informal-sanctions")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("비정형 결재 수정 테스트")
    @WithMockCustomUser(username = "user01", esntlId = "user01")
    void updateInformalSanctionTest() throws Exception {
        InformalSanctionDto dto = InformalSanctionDto.builder()
                .taskSeCd("001")
                .aplcntId("user01")
                .aprvrId("boss01")
                .build();

        mockMvc.perform(put("/api/v1/informal-sanctions/1")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("비정형 결재 승인/반려 테스트")
    @WithMockCustomUser(username = "user01", esntlId = "user01")
    void confirmInformalSanctionTest() throws Exception {
        mockMvc.perform(patch("/api/v1/informal-sanctions/1/confirm")
                        .with(csrf())
                        .param("confmAt", "C")
                        .param("returnResn", ""))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("비정형 결재 삭제 테스트")
    @WithMockCustomUser(username = "user01", esntlId = "user01")
    void deleteInformalSanctionTest() throws Exception {
        mockMvc.perform(delete("/api/v1/informal-sanctions/1")
                        .with(csrf()))
                .andExpect(status().isOk());
    }
}
