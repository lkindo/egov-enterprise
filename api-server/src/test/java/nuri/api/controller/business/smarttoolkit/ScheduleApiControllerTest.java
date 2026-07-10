package nuri.api.controller.business.smarttoolkit;

import nuri.business.service.schedule.EgovScheduleService;
import nuri.business.service.schedule.dto.ScheduleDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import nuri.business.support.ControllerTestSupport;

@WebMvcTest(ScheduleApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("ScheduleApiController 테스트")
class ScheduleApiControllerTest extends ControllerTestSupport {

    @MockitoBean
    private EgovScheduleService egovScheduleService;

    @Test
    @DisplayName("일정 목록 조회 성공")
    void getScheduleList_Success() throws Exception {
        // Given
        Page<ScheduleDto> page = new PageImpl<>(List.of(ScheduleDto.builder().schdlId("SCH1").schdlNm("Meeting").build()));
        given(egovScheduleService.getScheduleList(anyString(), any(PageRequest.class))).willReturn(page);

        // When & Then
        mockMvc.perform(get("/api/v1/schedules")
                .param("pageIndex", "1")
                .param("pageUnit", "10")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list[0].schdlId").value("SCH1"));
    }

    @Test
    @DisplayName("월간 일정 조회 성공")
    void getMonthlySchedule_Success() throws Exception {
        // Given
        given(egovScheduleService.getMonthlySchedule(anyString(), anyString())).willReturn(List.of(ScheduleDto.builder().schdlId("SCH1").build()));

        // When & Then
        mockMvc.perform(get("/api/v1/schedules/monthly")
                .param("yearMonth", "2023-10")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].schdlId").value("SCH1"));
    }

    @Test
    @DisplayName("부서 일정 목록 조회 성공")
    void getDeptScheduleList_Success() throws Exception {
        // Given
        setMockUser("USER_01");
        Page<ScheduleDto> page = new PageImpl<>(List.of(ScheduleDto.builder().schdlId("SCH2").schdlNm("Dept Meeting").build()));
        given(egovScheduleService.getScheduleList(eq("1"), eq("USER_01"), any(PageRequest.class))).willReturn(page);

        // When & Then
        mockMvc.perform(get("/api/v1/schedules/dept")
                .param("pageIndex", "1")
                .param("pageUnit", "10")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list[0].schdlId").value("SCH2"));
        
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("기간별 일정 조회 성공")
    void getScheduleByDateRange_Success() throws Exception {
        // Given
        setMockUser("USER_01");
        given(egovScheduleService.getScheduleListByDateRange(eq("USER_01"), eq("2023-10-01"), eq("2023-10-31")))
                .willReturn(List.of(ScheduleDto.builder().schdlId("SCH3").build()));

        // When & Then
        mockMvc.perform(get("/api/v1/schedules/range")
                .param("startDate", "2023-10-01")
                .param("endDate", "2023-10-31")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].schdlId").value("SCH3"));

        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("일정 상세 조회 성공")
    void getSchedule_Success() throws Exception {
        // Given
        given(egovScheduleService.getSchedule("SCH_ID")).willReturn(ScheduleDto.builder().schdlId("SCH_ID").schdlNm("Detail").build());

        // When & Then
        mockMvc.perform(get("/api/v1/schedules/SCH_ID")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.schdlId").value("SCH_ID"));
    }

    @Test
    @DisplayName("일정 등록 성공")
    void createSchedule_Success() throws Exception {
        // Given
        setMockUser("USER_01");
        ScheduleDto dto = ScheduleDto.builder().schdlNm("New Schedule").build();
        given(egovScheduleService.createSchedule(eq("USER_01"), any(ScheduleDto.class))).willReturn("NEW_SCH_ID");

        // When & Then
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/schedules")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto))
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value("NEW_SCH_ID"));

        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }

    // [H2] 제거됨: createSchedule_Anonymous — 컨트롤러의 수동 빈-401(엔벨로프 우회)을 검증하던 테스트.
    // 미인증 차단은 이제 Spring Security(anyRequest().authenticated())가 담당하며, 이는 standaloneSetup이
    // 아니라 시큐리티를 로딩하는 슬라이스 테스트에서 검증해야 한다(Phase 3 RBAC 네거티브 테스트 참조).

    @Test
    @DisplayName("일정 수정 성공")
    void updateSchedule_Success() throws Exception {
        // Given
        setMockUser("USER_01");
        ScheduleDto dto = ScheduleDto.builder().schdlNm("Update Title").build();

        // When & Then
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/schedules/SCH_ID")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto))
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("일정 삭제 성공")
    void deleteSchedule_Success() throws Exception {
        // Given
        setMockUser("USER_01");

        // When & Then
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/v1/schedules/SCH_ID")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }

    private void setMockUser(String userId) {
        if (userId == null) {
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
            return;
        }
        nuri.business.security.service.CustomUserDetails userDetails =
                org.mockito.Mockito.mock(nuri.business.security.service.CustomUserDetails.class);
        given(userDetails.getEsntlId()).willReturn(userId);
        org.springframework.security.authentication.UsernamePasswordAuthenticationToken auth =
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        userDetails, null, java.util.Collections.emptyList()
                );
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(auth);
    }
}
