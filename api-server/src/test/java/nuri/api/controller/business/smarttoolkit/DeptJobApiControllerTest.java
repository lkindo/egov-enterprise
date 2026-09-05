package nuri.api.controller.business.smarttoolkit;

import nuri.business.service.deptjob.DeptJobBoxService;
import nuri.business.service.deptjob.DeptJobService;
import nuri.business.service.deptjob.dto.DeptJobBoxDto;
import nuri.business.service.deptjob.dto.DeptJobDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.ArgumentCaptor;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import nuri.business.security.annotation.WithMockCustomUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.List;
import java.util.stream.Stream;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.assertNull;
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
    @DisplayName("[회귀] 부서 업무 등록 — 루트 POST 매핑이 존재하고 입력 DTO를 서비스에 전달한다")
    @WithMockCustomUser
    void createDeptJob_Success() throws Exception {
        given(deptJobService.createDeptJob(any(DeptJobDto.class))).willReturn(2L);

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

    static Stream<Arguments> invalidDeptJobBoxBodies() {
        return Stream.of(
                Arguments.of("업무함명 101자", "{\"deptTaskBoxNm\":\"" + "가".repeat(101) + "\"}"),
                Arguments.of("부서 ID 21자", "{\"deptId\":\"" + "D".repeat(21) + "\"}"));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("invalidDeptJobBoxBodies")
    @DisplayName("부서 업무함 저장 문자열은 Entity 상한을 넘으면 400")
    @WithMockCustomUser(role = "ADMIN")
    void createDeptJobBox_rejectsOversizedFields(String ignored, String body) throws Exception {
        mockMvc.perform(post("/api/v1/dept-jobs/boxes")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(egovDeptJobBoxService);
    }

    static Stream<Arguments> invalidDeptJobBodies() {
        return Stream.of(
                Arguments.of("업무명 101자", "{\"deptTaskNm\":\"" + "가".repeat(101) + "\"}"),
                Arguments.of("업무 내용 4001자", "{\"deptTaskCn\":\"" + "가".repeat(4001) + "\"}"),
                Arguments.of("담당자 ID 21자", "{\"picId\":\"" + "U".repeat(21) + "\"}"),
                Arguments.of("우선순위 13자", "{\"prrtyRnk\":\"" + "1".repeat(13) + "\"}"));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("invalidDeptJobBodies")
    @DisplayName("부서 업무 저장 문자열은 Entity 상한을 넘으면 400")
    @WithMockCustomUser
    void createDeptJob_rejectsOversizedFields(String ignored, String body) throws Exception {
        mockMvc.perform(post("/api/v1/dept-jobs")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(deptJobService);
    }

    @Test
    @DisplayName("부서 업무 수정도 DTO 상한 검증을 통과해야 서비스에 도달한다")
    @WithMockCustomUser
    void updateDeptJob_rejectsOversizedContent() throws Exception {
        mockMvc.perform(put("/api/v1/dept-jobs/1")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"deptTaskCn\":\"" + "가".repeat(4001) + "\"}"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(deptJobService);
    }

    @Test
    @DisplayName("부서 업무함 요청의 서버 소유 필드는 Jackson 경계에서 무시한다")
    @WithMockCustomUser(esntlId = "USR_001", role = "ADMIN")
    void createDeptJobBox_ignoresForgedServerOwnedFields() throws Exception {
        given(egovDeptJobBoxService.createDeptJobBox(eq("USR_001"), any(DeptJobBoxDto.class))).willReturn(2L);

        mockMvc.perform(post("/api/v1/dept-jobs/boxes")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "deptTaskBoxSn": 999,
                                  "deptTaskBoxNm": "기획함",
                                  "deptNm": "위조 부서명",
                                  "frstRgtrId": "forged",
                                  "crtDt": "2026-09-06T00:00:00",
                                  "lastMdfrId": "forged",
                                  "mdfcnDt": "2026-09-06T00:00:00"
                                }
                                """))
                .andExpect(status().isOk());

        ArgumentCaptor<DeptJobBoxDto> captor = ArgumentCaptor.forClass(DeptJobBoxDto.class);
        verify(egovDeptJobBoxService).createDeptJobBox(eq("USR_001"), captor.capture());
        DeptJobBoxDto bound = captor.getValue();
        assertNull(bound.getDeptTaskBoxSn());
        assertNull(bound.getDeptNm());
        assertNull(bound.getFrstRgtrId());
        assertNull(bound.getCrtDt());
        assertNull(bound.getLastMdfrId());
        assertNull(bound.getMdfcnDt());
    }

    @Test
    @DisplayName("부서 업무 요청의 서버 소유 필드는 Jackson 경계에서 무시한다")
    @WithMockCustomUser
    void createDeptJob_ignoresForgedServerOwnedFields() throws Exception {
        given(deptJobService.createDeptJob(any(DeptJobDto.class))).willReturn(2L);

        mockMvc.perform(post("/api/v1/dept-jobs")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "deptTaskSn": 999,
                                  "deptTaskNm": "신규 업무",
                                  "deptTaskBoxNm": "위조 업무함",
                                  "deptId": "FORGED",
                                  "deptNm": "위조 부서",
                                  "picNm": "위조 담당자",
                                  "frstRgtrId": "forged",
                                  "crtDt": "2026-09-06T00:00:00",
                                  "lastMdfrId": "forged",
                                  "mdfcnDt": "2026-09-06T00:00:00"
                                }
                                """))
                .andExpect(status().isOk());

        ArgumentCaptor<DeptJobDto> captor = ArgumentCaptor.forClass(DeptJobDto.class);
        verify(deptJobService).createDeptJob(captor.capture());
        DeptJobDto bound = captor.getValue();
        assertNull(bound.getDeptTaskSn());
        assertNull(bound.getDeptTaskBoxNm());
        assertNull(bound.getDeptId());
        assertNull(bound.getDeptNm());
        assertNull(bound.getPicNm());
        assertNull(bound.getFrstRgtrId());
        assertNull(bound.getCrtDt());
        assertNull(bound.getLastMdfrId());
        assertNull(bound.getMdfcnDt());
    }
}
