package nuri.business.service.report;

import nuri.business.domain.report.WorkReport;
import nuri.business.domain.report.WorkReportRepository;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.report.dto.WorkReportDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("WorkReportService 단위 테스트")
class WorkReportServiceTest {

    @Mock
    private WorkReportRepository workReportRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private WorkReportService workReportService;

    // ── 인증 주체 셋업 ────────────────────────────────────────────────────────────
    // [2026-07-29] 조회 경로에 소유권 가드가 붙으면서 이 테스트들은 **인증 주체를 요구**한다.
    //   종전에 가드 없이 통과하던 것이 결함이었고, 가드 도입으로 red 가 난 것이 곧 가드가 사는 증거다.
    private static void authenticateAs(String loginId, String authority) {
        CustomUserDetails principal =
                new CustomUserDetails(loginId, "ESNTL_" + loginId, loginId, "", null, "N", authority);
        Authentication auth =
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        SecurityContext ctx = SecurityContextHolder.createEmptyContext();
        ctx.setAuthentication(auth);
        SecurityContextHolder.setContext(ctx);
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("업무보고 등록 테스트")
    void registerWorkReportTest() {
        WorkReportDto dto = WorkReportDto.builder()
                .rptTtl("주간보고")
                .rptCn("내용")
                .userId("user01")
                .build();

        workReportService.createWorkReport("user1", dto);

        // 회귀 방어: PK 는 DB IDENTITY가 채번하고 작성자는 인증 주체로 고정되어야 한다.
        org.mockito.ArgumentCaptor<WorkReport> captor = org.mockito.ArgumentCaptor.forClass(WorkReport.class);
        verify(workReportRepository, times(1)).save(captor.capture());
        WorkReport saved = captor.getValue();
        org.assertj.core.api.Assertions.assertThat(saved.getRptpSn()).isNull();
        org.assertj.core.api.Assertions.assertThat(saved.getUserId()).isEqualTo("user1");
    }

    @Test
    @DisplayName("업무보고 수정 테스트")
    void updateWorkReportTest() {
        WorkReportDto dto = WorkReportDto.builder()
                .rptpSn(1L)
                .rptTtl("수정보고")
                .userId("user01")
                .build();

        WorkReport report = WorkReport.builder()
                .rptpSn(1L)
                .rptTtl("주간보고")
                .userId("user01")
                .build();

        when(workReportRepository.findById(1L)).thenReturn(Optional.of(report));

        // 소유권 가드(정적)는 단위 테스트에서 no-op 처리(SecurityContext 부재).
        try (var mocked = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            workReportService.updateWorkReport(dto);
        }

        assertEquals("수정보고", report.getRptTtl());
    }

    @Test
    @DisplayName("업무보고 삭제 테스트")
    void deleteWorkReportTest() {
        WorkReport report = WorkReport.builder()
                .rptpSn(1L)
                .rptTtl("주간보고")
                .build();
        when(workReportRepository.findById(1L)).thenReturn(Optional.of(report));

        try (var mocked = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            workReportService.deleteWorkReport(1L);
        }

        verify(workReportRepository, times(1)).delete(report);
    }

    @Test
    @DisplayName("업무보고 상세 조회 테스트")
    void getWorkReportTest() {
        WorkReport report = WorkReport.builder()
                .rptpSn(1L)
                .rptTtl("주간보고")
                .rptCn("내용")
                .userId("user01")
                .build();

        when(workReportRepository.findById(1L)).thenReturn(Optional.of(report));
        authenticateAs("admin01", "ROLE_ADMIN"); // 관리자는 소유권을 우회한다(update/delete 와 동일 판정)

        WorkReportDto result = workReportService.getWorkReport(1L);

        assertNotNull(result);
        assertEquals(1L, result.getRptpSn());
        assertEquals("주간보고", result.getRptTtl());
    }

    @Test
    @DisplayName("업무보고 상세 — 타인 보고서는 거부한다 (IDOR 방어)")
    void getWorkReport_deniedForNonOwner() {
        // frstRgtrId 는 감사 컬럼이라 빌더로 설정되지 않는다(null) → 소유자 불일치 상태를 만든다.
        WorkReport othersReport = WorkReport.builder().rptpSn(2L).rptTtl("타인 보고").build();
        when(workReportRepository.findById(2L)).thenReturn(Optional.of(othersReport));
        authenticateAs("user01", "ROLE_USER");

        assertThrows(BusinessException.class, () -> workReportService.getWorkReport(2L));
    }

    @Test
    @DisplayName("업무보고 목록 조회 테스트")
    void getWorkReportListTest() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<WorkReport> page = new PageImpl<>(Collections.emptyList(), pageable, 0);

        when(workReportRepository.searchWorkReports(any(), any(), any(), any(), any(), any(), any(), any(), any(Pageable.class))).thenReturn(page);
        authenticateAs("admin01", "ROLE_ADMIN"); // 관리자는 전체 조회 — searchId 가 그대로 전달된다

        Page<WorkReportDto> result = workReportService.getWorkReportList("user01", null, "", pageable);

        assertNotNull(result);
        assertEquals(0, result.getTotalElements());
    }

    @Test
    @DisplayName("업무보고 목록 — 비관리자는 본인 것으로 강제 스코프된다 (전원 노출 방어)")
    void getWorkReportList_scopedToCurrentUserForNonAdmin() {
        Pageable pageable = PageRequest.of(0, 10);
        when(workReportRepository.searchWorkReports(any(), any(), any(), any(), any(), any(), any(), any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(Collections.emptyList(), pageable, 0));
        authenticateAs("user01", "ROLE_USER");

        // 호출부가 타인 id 를 넘겨도 무시되고 인증 주체로 덮어써야 한다.
        workReportService.getWorkReportList("someoneElse", null, "", pageable);

        ArgumentCaptor<String> searchId = ArgumentCaptor.forClass(String.class);
        verify(workReportRepository).searchWorkReports(searchId.capture(), any(), any(), any(), any(), any(), any(), any(), any(Pageable.class));
        assertEquals("user01", searchId.getValue());
    }

    @Test
    @DisplayName("업무보고 목록 — 인증 주체가 없으면 열지 않는다")
    void getWorkReportList_emptyWhenUnauthenticated() {
        Pageable pageable = PageRequest.of(0, 10);

        Page<WorkReportDto> result = workReportService.getWorkReportList("user01", null, "", pageable);

        assertEquals(0, result.getTotalElements());
        verify(workReportRepository, never())
                .searchWorkReports(any(), any(), any(), any(), any(), any(), any(), any(), any(Pageable.class));
    }

    // ── 작성자 표시 ──────────────────────────────────────────────────────────────
    //
    // 목록의 '작성자' 열이 종전에는 userId 원문(로그인 ID)을 그대로 보여 줬다. 사람 이름이
    // 아니라 계정 문자열이라 누가 쓴 보고인지 화면만으로는 알 수 없었다.
    //
    // ⚠ 축 정합이 이 기능의 유일한 함정이다. WorkReport.userId 는 등록 시 getCurrentLoginId()
    //   로 고정되므로 tb_user_info.user_id(loginId) 축이다. esntlId 로 join 하면 **조용히
    //   0건**이 되어 이름이 하나도 안 붙는데, 화면은 그냥 예전처럼 ID 를 보여 주므로 아무도
    //   눈치채지 못한다. 그래서 loginId 로 조회하는지를 명시적으로 고정한다.

    private static User userNamed(String loginId, String name) {
        return User.builder().esntlId("ESNTL_" + loginId).userId(loginId).userNm(name).build();
    }

    @Test
    @DisplayName("작성자 이름을 로그인 ID 축으로 조회해 한 번에 붙인다")
    void getWorkReportList_resolvesAuthorNamesByLoginId() {
        authenticateAs("admin01", "ROLE_ADMIN");
        Pageable pageable = PageRequest.of(0, 10);
        WorkReport a = WorkReport.builder().rptpSn(1L).rptTtl("보고 A").userId("user01").build();
        WorkReport b = WorkReport.builder().rptpSn(2L).rptTtl("보고 B").userId("user02").build();
        when(workReportRepository.searchWorkReports(any(), any(), any(), any(), any(), any(), any(), any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(a, b), pageable, 2));
        when(userRepository.findByUserIdIn(any()))
                .thenReturn(List.of(userNamed("user01", "홍길동"), userNamed("user02", "김철수")));

        Page<WorkReportDto> result = workReportService.getWorkReportList(null, null, "", pageable);

        assertEquals("홍길동", result.getContent().get(0).getUserNm());
        assertEquals("김철수", result.getContent().get(1).getUserNm());
        // 로그인 ID 는 그대로 유지한다 — 화면이 이름을 못 찾았을 때 되돌아갈 값이다.
        assertEquals("user01", result.getContent().get(0).getUserId());

        // 행마다 조회하면 페이지당 N 회다. 한 번에 모아 받는지, 그리고 **loginId** 를 넘기는지 고정한다.
        // (esntlId 로 조회하면 인자가 ESNTL_* 가 되어 이 단언이 red 다 — 조용한 0건을 여기서 잡는다.)
        verify(userRepository, times(1)).findByUserIdIn(Set.of("user01", "user02"));
    }

    @Test
    @DisplayName("이름을 찾지 못하면 지어내지 않는다 — 화면이 로그인 ID 로 되돌아갈 수 있게 비워 둔다")
    void getWorkReportList_leavesAuthorNameNullWhenUnknown() {
        authenticateAs("admin01", "ROLE_ADMIN");
        Pageable pageable = PageRequest.of(0, 10);
        WorkReport orphan = WorkReport.builder().rptpSn(3L).rptTtl("탈퇴자 보고").userId("gone01").build();
        when(workReportRepository.searchWorkReports(any(), any(), any(), any(), any(), any(), any(), any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(orphan), pageable, 1));
        when(userRepository.findByUserIdIn(any())).thenReturn(List.of());

        Page<WorkReportDto> result = workReportService.getWorkReportList(null, null, "", pageable);

        assertNull(result.getContent().get(0).getUserNm(), "'알 수 없음' 같은 값을 지어내지 않는다");
        assertEquals("gone01", result.getContent().get(0).getUserId());
    }

    @Test
    @DisplayName("작성자가 없는 행만 있으면 사용자 조회를 아예 하지 않는다")
    void getWorkReportList_skipsLookupWhenNoAuthors() {
        authenticateAs("admin01", "ROLE_ADMIN");
        Pageable pageable = PageRequest.of(0, 10);
        WorkReport blank = WorkReport.builder().rptpSn(4L).rptTtl("작성자 없음").build();
        when(workReportRepository.searchWorkReports(any(), any(), any(), any(), any(), any(), any(), any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(blank), pageable, 1));

        workReportService.getWorkReportList(null, null, "", pageable);

        verify(userRepository, never()).findByUserIdIn(any());
    }
}
