package nuri.api.controller.business.smarttoolkit;

import nuri.business.service.deptjob.DeptJobBoxService;
import nuri.business.service.deptjob.DeptJobService;
import nuri.business.service.deptjob.dto.DeptJobBoxDto;
import nuri.business.service.deptjob.dto.DeptJobDto;
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
import static org.mockito.BDDMockito.then;
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

    @MockitoBean
    private DeptJobService deptJobService;

    @Test
    @DisplayName("부서 업무함 목록 조회 성공")
    @WithMockCustomUser
    void getDeptJobBoxList_Success() throws Exception {
        // Given
        Page<DeptJobBoxDto> page = new PageImpl<>(List.of(DeptJobBoxDto.builder().deptTaskBoxSn(1L).build()));
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
        given(egovDeptJobBoxService.getDeptJobBox(1L)).willReturn(DeptJobBoxDto.builder().deptTaskBoxSn(1L).build());

        // When & Then
        mockMvc.perform(get("/api/v1/dept-jobs/boxes/1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    // 쓰기 3본은 @PreAuthorize(ADMIN/SYSTEM). esntlId="USR_001" 로 서비스 mock 인자 매칭 유지.
    @Test
    @DisplayName("부서 업무함 등록 성공 (ADMIN)")
    @WithMockCustomUser(esntlId = "USR_001", role = "ADMIN")
    void createDeptJobBox_Success() throws Exception {
        given(egovDeptJobBoxService.createDeptJobBox(eq("USR_001"), any(DeptJobBoxDto.class))).willReturn(2L);

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
    @DisplayName("부서 업무함 등록 — 이름이 비면 400 (DEC-OPS-037 제품 규칙)")
    @WithMockCustomUser(esntlId = "USR_001", role = "ADMIN")
    void createDeptJobBox_BlankName_BadRequest() throws Exception {
        mockMvc.perform(post("/api/v1/dept-jobs/boxes")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(DeptJobBoxDto.builder()
                                .deptTaskBoxNm("   ")
                                .deptId("D1")
                                .build())))
                .andExpect(status().isBadRequest());
        then(egovDeptJobBoxService).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("부서 업무함 수정 성공 (ADMIN)")
    @WithMockCustomUser(esntlId = "USR_001", role = "ADMIN")
    void updateDeptJobBox_Success() throws Exception {
        doNothing().when(egovDeptJobBoxService).updateDeptJobBox(eq(1L), eq("USR_001"), any(DeptJobBoxDto.class));

        mockMvc.perform(put("/api/v1/dept-jobs/boxes/1")
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
        doNothing().when(egovDeptJobBoxService).deleteDeptJobBox(1L);

        mockMvc.perform(delete("/api/v1/dept-jobs/boxes/1")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    // 참고: 비관리자 쓰기 차단(403)의 실집행 검증은 두 곳에 있다.
    //  ① 존재: SecurityAuthAnnotationLinterTest 가 이 컨트롤러 쓰기 3본의 @PreAuthorize 를 정적 오딧(allow-list 졸업).
    //  ② 집행: 서비스 2차 가드(SecurityUtil.assertAdmin)의 ACCESS_DENIED 는 DeptJobBoxServiceTest 네거티브가 검증.
    // @WebMvcTest 슬라이스는 메서드 시큐리티 미적용(코드베이스 관례: 통합 RBAC 매트릭스가 집행 담당)이라
    // 여기서는 해피패스(ADMIN)만 둔다.

    // ── 부서 업무(DeptJob) — 종전에는 컨트롤러에 매핑이 아예 없어 등록이 동작하지 않았다 ──

    @Test
    @DisplayName("[회귀] 부서 업무 등록 — 루트 POST 매핑이 존재하고 인증 주체를 서비스로 넘긴다")
    @WithMockCustomUser
    void createDeptJob_Success() throws Exception {
        // @WithMockCustomUser 의 기본 esntlId 는 "user01" 이다. 이 값으로 스텁해야
        // "컨트롤러가 인증 주체를 서비스로 넘긴다" 는 명제가 실제로 검증된다
        // (형제 테스트들은 반환값을 단언하지 않아 축이 틀려도 드러나지 않았다).
        given(deptJobService.createDeptJob(eq("user01"), any(DeptJobDto.class))).willReturn(2L);

        mockMvc.perform(post("/api/v1/dept-jobs")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"deptTaskNm\":\"신규 업무\",\"deptTaskCn\":\"내용\",\"prrtyRnk\":\"2\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value(2));
    }

    @Test
    @DisplayName("부서 업무 목록 조회 성공")
    @WithMockCustomUser
    void getDeptJobList_Success() throws Exception {
        Page<DeptJobDto> page = new PageImpl<>(List.of(DeptJobDto.builder().deptTaskSn(1L).build()));
        given(deptJobService.getDeptJobList(any(), any(), any(), any(), anyBoolean(), any(Pageable.class)))
                .willReturn(page);

        mockMvc.perform(get("/api/v1/dept-jobs"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("[소유 스코프] scope 미지정이면 '내 업무만'(mineOnly=true)으로 조회한다")
    @WithMockCustomUser
    void getDeptJobList_defaultsToMineOnly() throws Exception {
        // 기본값이 전체로 새면 토글을 달아도 실제 노출은 부서 전체가 된다.
        // eq(true) 로만 스텁했으므로, 컨트롤러가 false 를 넘기면 스텁이 매칭되지 않아 실패한다.
        Page<DeptJobDto> page = new PageImpl<>(List.of(DeptJobDto.builder().deptTaskSn(1L).build()));
        given(deptJobService.getDeptJobList(any(), any(), any(), any(), eq(true), any(Pageable.class)))
                .willReturn(page);

        mockMvc.perform(get("/api/v1/dept-jobs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list[0].deptTaskSn").value(1));
    }

    @Test
    @DisplayName("[소유 스코프] scope=dept 일 때만 부서 전체(mineOnly=false)로 조회한다")
    @WithMockCustomUser
    void getDeptJobList_deptScopeWidens() throws Exception {
        Page<DeptJobDto> page = new PageImpl<>(List.of(DeptJobDto.builder().deptTaskSn(1L).build()));
        given(deptJobService.getDeptJobList(any(), any(), any(), any(), eq(false), any(Pageable.class)))
                .willReturn(page);

        mockMvc.perform(get("/api/v1/dept-jobs").param("scope", "dept"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list[0].deptTaskSn").value(1));
    }

    @Test
    @DisplayName("부서 업무 삭제 성공")
    @WithMockCustomUser
    void deleteDeptJob_Success() throws Exception {
        doNothing().when(deptJobService).deleteDeptJob(1L);

        mockMvc.perform(delete("/api/v1/dept-jobs/1").with(csrf()))
                .andExpect(status().isOk());
    }
}
