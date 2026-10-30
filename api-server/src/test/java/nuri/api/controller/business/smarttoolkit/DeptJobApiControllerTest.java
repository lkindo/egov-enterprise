package nuri.api.controller.business.smarttoolkit;

import nuri.business.service.deptjob.DeptJobBoxService;
import nuri.business.service.deptjob.DeptJobService;
import nuri.business.service.deptjob.dto.DeptJobBoxDto;
import nuri.business.service.deptjob.dto.DeptJobDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.ArgumentCaptor;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
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
import static org.mockito.BDDMockito.then;
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
                .param("page", "1")
                .param("size", "10")
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
                .andExpect(status().isCreated())
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
    //  ① 존재: SecurityAuthAnnotationLinterTest 가 이 컨트롤러 쓰기 3본의 @PreAuthorize 가 자기 operation binding
    //     (DEPT_BOX_CREATE/UPDATE/DELETE)을 가리키는지 정적 오딧(allow-list 졸업).
    //  ② 집행: 서비스 2차 가드(SecurityUtil.assertPermission)의 ACCESS_DENIED 는 DeptJobBoxServiceTest 네거티브가 검증.
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
                .andExpect(status().isCreated())
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

    // ROLE_USER fixture resolves DEPT_JOB_UPDATE from the permission catalog, as this PATCH requires.
    @Test
    @DisplayName("담당자 재지정은 인가 후 서비스가 거절한 누락 버전을 400으로 응답한다")
    @WithMockCustomUser(username = "registrar", esntlId = "USR_REGISTRAR")
    void reassignDeptJob_missingVersion_BadRequest() throws Exception {
        // DEC-OPS-359 keeps authorization before a missing-version error, so null reaches the service.
        doThrow(new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE))
                .when(deptJobService).reassignDeptJob(1L, "USR_NEW", null);

        mockMvc.perform(patch("/api/v1/dept-jobs/1/assignee")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"picId":"USR_NEW"}
                                """))
                .andExpect(status().isBadRequest());

        verify(deptJobService).reassignDeptJob(1L, "USR_NEW", null);
    }

    @Test
    @DisplayName("담당자 재지정은 버전이 없어도 서비스의 인가 거절을 403으로 응답한다")
    @WithMockCustomUser(username = "stranger", esntlId = "USR_STRANGER")
    void reassignDeptJob_missingVersionPreservesForbiddenResponse() throws Exception {
        doThrow(new BusinessException(CommonErrorCode.ACCESS_DENIED))
                .when(deptJobService).reassignDeptJob(1L, "USR_NEW", null);

        mockMvc.perform(patch("/api/v1/dept-jobs/1/assignee")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"picId":"USR_NEW"}
                                """))
                .andExpect(status().isForbidden());

        verify(deptJobService).reassignDeptJob(1L, "USR_NEW", null);
    }

    @Test
    @DisplayName("담당자 재지정은 서비스의 낡은 버전 거절을 409로 응답한다")
    @WithMockCustomUser(username = "registrar", esntlId = "USR_REGISTRAR")
    void reassignDeptJob_staleVersion_Conflict() throws Exception {
        doThrow(new BusinessException(CommonErrorCode.CONCURRENT_MODIFICATION))
                .when(deptJobService).reassignDeptJob(1L, "USR_NEW", 0);

        mockMvc.perform(patch("/api/v1/dept-jobs/1/assignee")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"picId":"USR_NEW","version":0}
                                """))
                .andExpect(status().isConflict());

        verify(deptJobService).reassignDeptJob(1L, "USR_NEW", 0);
    }

    @Test
    @DisplayName("담당자 재지정은 음수 버전이면 서비스 호출 전에 400")
    @WithMockCustomUser(username = "registrar", esntlId = "USR_REGISTRAR")
    void reassignDeptJob_negativeVersion_BadRequest() throws Exception {
        mockMvc.perform(patch("/api/v1/dept-jobs/1/assignee")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"picId":"USR_NEW","version":-1}
                                """))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(deptJobService);
    }

    @Test
    @DisplayName("담당자 재지정은 버전 0을 포함한 유효한 요청을 서비스에 전달한다")
    @WithMockCustomUser(username = "registrar", esntlId = "USR_REGISTRAR")
    void reassignDeptJob_versionPresent_Success() throws Exception {
        doNothing().when(deptJobService).reassignDeptJob(1L, "USR_NEW", 0);

        mockMvc.perform(patch("/api/v1/dept-jobs/1/assignee")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"picId":"USR_NEW","version":0}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(deptJobService).reassignDeptJob(1L, "USR_NEW", 0);
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
                .andExpect(status().isCreated());

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
                .andExpect(status().isCreated());

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

    @ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"1", "\"4\""})
    @DisplayName("부서 업무 우선순위는 승인된 JSON 문자열만 받는다")
    @WithMockCustomUser
    void priorityRejectsRawNumbersAndOutOfPolicyStrings(String rawPriority) throws Exception {
        given(deptJobService.createDeptJob(any(DeptJobDto.class))).willReturn(2L);
        mockMvc.perform(post("/api/v1/dept-jobs")
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"deptTaskNm\":\"신규 업무\",\"prrtyRnk\":" + rawPriority + "}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(deptJobService);
    }

    @ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"1", "true", "false", "{}", "[]", "[\"1\"]", "1.0"})
    @WithMockCustomUser
    void priorityRejectsNonStringJsonTypesOnBothWrites(String rawPriority) throws Exception {
        assertPriorityRejectedOnBothWrites(rawPriority);
    }

    @ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"", " ", "01", "1.0", "+1", "-1", "0", "4", "1\n", "1\r\n", "\n1"})
    @WithMockCustomUser
    void priorityRejectsNonCanonicalStringsOnBothWrites(String priority) throws Exception {
        assertPriorityRejectedOnBothWrites(objectMapper.writeValueAsString(priority));
    }

    private void assertPriorityRejectedOnBothWrites(String rawPriority) throws Exception {
        String body = "{\"deptTaskNm\":\"업무\",\"version\":0,\"prrtyRnk\":" + rawPriority + "}";
        mockMvc.perform(post("/api/v1/dept-jobs").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());
        mockMvc.perform(put("/api/v1/dept-jobs/2").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(deptJobService);
    }

    @ParameterizedTest
    @org.junit.jupiter.params.provider.NullSource
    @org.junit.jupiter.params.provider.ValueSource(strings = {"1", "2", "3"})
    @WithMockCustomUser
    void validOrNullPriorityIsPassedUnchangedToBothWrites(String priority) throws Exception {
        assertPriorityWriteMapping(",\"prrtyRnk\":" + objectMapper.writeValueAsString(priority), priority);
    }

    @Test
    @WithMockCustomUser
    void omittedPriorityRemainsNullInBothWrites() throws Exception {
        assertPriorityWriteMapping("", null);
    }

    private void assertPriorityWriteMapping(String priorityProperty, String priority) throws Exception {
        given(deptJobService.createDeptJob(any(DeptJobDto.class))).willReturn(2L);
        String body = "{\"deptTaskBoxSn\":7,\"deptTaskNm\":\"업무\",\"deptTaskCn\":\"내용\","
                + "\"picId\":\"USER2\",\"atchFileSn\":9,\"version\":0" + priorityProperty + "}";
        mockMvc.perform(post("/api/v1/dept-jobs").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());
        mockMvc.perform(put("/api/v1/dept-jobs/2").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());
        ArgumentCaptor<DeptJobDto> created = ArgumentCaptor.forClass(DeptJobDto.class);
        ArgumentCaptor<DeptJobDto> updated = ArgumentCaptor.forClass(DeptJobDto.class);
        verify(deptJobService).createDeptJob(created.capture());
        verify(deptJobService).updateDeptJob(eq(2L), updated.capture());
        for (DeptJobDto request : List.of(created.getValue(), updated.getValue())) {
            org.assertj.core.api.Assertions.assertThat(request.getPrrtyRnk()).isEqualTo(priority);
            org.assertj.core.api.Assertions.assertThat(request.getDeptTaskBoxSn()).isEqualTo(7L);
            org.assertj.core.api.Assertions.assertThat(request.getDeptTaskNm()).isEqualTo("업무");
            org.assertj.core.api.Assertions.assertThat(request.getDeptTaskCn()).isEqualTo("내용");
            org.assertj.core.api.Assertions.assertThat(request.getPicId()).isEqualTo("USER2");
            org.assertj.core.api.Assertions.assertThat(request.getAtchFileSn()).isEqualTo(9L);
            org.assertj.core.api.Assertions.assertThat(request.getVersion()).isZero();
        }
    }

    @Test
    @WithMockCustomUser
    void legacyPriorityIsStillReadable() throws Exception {
        given(deptJobService.getDeptJob(2L)).willReturn(DeptJobDto.builder().deptTaskSn(2L).prrtyRnk("01").build());

        mockMvc.perform(get("/api/v1/dept-jobs/2"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.prrtyRnk").value("01"));
    }

    @Test
    @WithMockCustomUser
    void invalidPriorityIdentifiesTheFieldToCorrect() throws Exception {
        mockMvc.perform(put("/api/v1/dept-jobs/2").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"deptTaskNm\":\"업무\",\"version\":0,\"prrtyRnk\":\"4\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors[0].field").value("prrtyRnk"));
        verifyNoInteractions(deptJobService);
    }
}
