package nuri.api.controller.business.smarttoolkit;

import nuri.business.service.deptjob.DeptJobBoxService;
import nuri.business.service.deptjob.dto.DeptJobBoxDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import nuri.business.security.annotation.WithMockCustomUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doNothing;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import nuri.business.support.ControllerTestSupport;

@WebMvcTest(DeptJobApiController.class)
@DisplayName("DeptJobApiController 테스트")
class DeptJobApiControllerTest extends ControllerTestSupport {

    @MockitoBean
    private DeptJobBoxService egovDeptJobBoxService;

    @Test
    @DisplayName("부서 업무함 목록 조회 성공")
    @WithMockCustomUser
    void getDeptJobBoxList_Success() throws Exception {
        // Given
        Page<DeptJobBoxDto> page = new PageImpl<>(List.of(DeptJobBoxDto.builder().deptTaskBoxId("BOX1").build()));
        given(egovDeptJobBoxService.getDeptJobBoxList(anyString(), any(Pageable.class))).willReturn(page);

        // When & Then
        mockMvc.perform(get("/api/v1/dept-jobs/boxes")
                .param("pageIndex", "1")
                .param("pageUnit", "10")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("부서 업무함 상세 조회 성공")
    @WithMockCustomUser
    void getDeptJobBox_Success() throws Exception {
        // Given
        given(egovDeptJobBoxService.getDeptJobBox("BOX1")).willReturn(DeptJobBoxDto.builder().deptTaskBoxId("BOX1").build());

        // When & Then
        mockMvc.perform(get("/api/v1/dept-jobs/boxes/BOX1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    // 쓰기 3본은 @PreAuthorize(ADMIN/SYSTEM). esntlId="USR_001" 로 서비스 mock 인자 매칭 유지.
    @Test
    @DisplayName("부서 업무함 등록 성공 (ADMIN)")
    @WithMockCustomUser(esntlId = "USR_001", role = "ADMIN")
    void createDeptJobBox_Success() throws Exception {
        given(egovDeptJobBoxService.createDeptJobBox(eq("USR_001"), any(DeptJobBoxDto.class))).willReturn("NEW_ID");

        mockMvc.perform(post("/api/v1/dept-jobs/boxes")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(DeptJobBoxDto.builder()
                                .deptTaskBoxNm("Test Box")
                                .deptId("D1")
                                .build())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("부서 업무함 수정 성공 (ADMIN)")
    @WithMockCustomUser(esntlId = "USR_001", role = "ADMIN")
    void updateDeptJobBox_Success() throws Exception {
        doNothing().when(egovDeptJobBoxService).updateDeptJobBox(eq("BOX1"), eq("USR_001"), any(DeptJobBoxDto.class));

        mockMvc.perform(put("/api/v1/dept-jobs/boxes/BOX1")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(DeptJobBoxDto.builder()
                                .deptTaskBoxNm("Updated Box")
                                .deptId("D1")
                                .build())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("부서 업무함 삭제 성공 (ADMIN)")
    @WithMockCustomUser(esntlId = "USR_001", role = "ADMIN")
    void deleteDeptJobBox_Success() throws Exception {
        doNothing().when(egovDeptJobBoxService).deleteDeptJobBox("BOX1");

        mockMvc.perform(delete("/api/v1/dept-jobs/boxes/BOX1")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    // 참고: 비관리자 쓰기 차단(403)의 실집행 검증은 두 곳에 있다.
    //  ① 존재: SecurityAuthAnnotationLinterTest 가 이 컨트롤러 쓰기 3본의 @PreAuthorize 를 정적 오딧(allow-list 졸업).
    //  ② 집행: 서비스 2차 가드(SecurityUtil.assertAdmin)의 ACCESS_DENIED 는 DeptJobBoxServiceTest 네거티브가 검증.
    // @WebMvcTest 슬라이스는 메서드 시큐리티 미적용(코드베이스 관례: 통합 RBAC 매트릭스가 집행 담당)이라
    // 여기서는 해피패스(ADMIN)만 둔다.
}
