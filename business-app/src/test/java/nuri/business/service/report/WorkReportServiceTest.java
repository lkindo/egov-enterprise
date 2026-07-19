package nuri.business.service.report;

import nuri.business.domain.report.WorkReport;
import nuri.business.domain.report.WorkReportRepository;
import nuri.business.service.report.dto.WorkReportDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("WorkReportService 단위 테스트")
class WorkReportServiceTest {

    @Mock
    private WorkReportRepository workReportRepository;

    @InjectMocks
    private WorkReportService workReportService;

    @Test
    @DisplayName("업무보고 등록 테스트")
    void registerWorkReportTest() {
        WorkReportDto dto = WorkReportDto.builder()
                .rptId("REPO_001")
                .rptTtl("주간보고")
                .rptCn("내용")
                .userId("user01")
                .build();

        workReportService.createWorkReport("user1", dto);

        // 회귀 방어: PK 는 서버가 채번하고 작성자는 인증 주체로 고정되어야 한다.
        // 종전에는 dto 의 rptId/userId 를 그대로 복사해, 폼이 rptId 를 보내지 않으면 null PK 로 500 이 났다.
        org.mockito.ArgumentCaptor<WorkReport> captor = org.mockito.ArgumentCaptor.forClass(WorkReport.class);
        verify(workReportRepository, times(1)).save(captor.capture());
        WorkReport saved = captor.getValue();
        org.assertj.core.api.Assertions.assertThat(saved.getRptId()).isNotEqualTo("REPO_001").startsWith("RPT_");
        org.assertj.core.api.Assertions.assertThat(saved.getUserId()).isEqualTo("user1");
    }

    @Test
    @DisplayName("업무보고 수정 테스트")
    void updateWorkReportTest() {
        WorkReportDto dto = WorkReportDto.builder()
                .rptId("REPO_001")
                .rptTtl("수정보고")
                .userId("user01")
                .build();

        WorkReport report = WorkReport.builder()
                .rptId("REPO_001")
                .rptTtl("주간보고")
                .userId("user01")
                .build();

        when(workReportRepository.findById("REPO_001")).thenReturn(Optional.of(report));

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
                .rptId("REPO_001")
                .rptTtl("주간보고")
                .build();
        when(workReportRepository.findById("REPO_001")).thenReturn(Optional.of(report));

        try (var mocked = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            workReportService.deleteWorkReport("REPO_001");
        }

        verify(workReportRepository, times(1)).delete(report);
    }

    @Test
    @DisplayName("업무보고 상세 조회 테스트")
    void getWorkReportTest() {
        WorkReport report = WorkReport.builder()
                .rptId("REPO_001")
                .rptTtl("주간보고")
                .rptCn("내용")
                .userId("user01")
                .build();

        when(workReportRepository.findById("REPO_001")).thenReturn(Optional.of(report));

        WorkReportDto result = workReportService.getWorkReport("REPO_001");

        assertNotNull(result);
        assertEquals("REPO_001", result.getRptId());
        assertEquals("주간보고", result.getRptTtl());
    }

    @Test
    @DisplayName("업무보고 목록 조회 테스트")
    void getWorkReportListTest() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<WorkReport> page = new PageImpl<>(Collections.emptyList(), pageable, 0);

        when(workReportRepository.searchWorkReports(any(), any(), any(), any(), any(), any(), any(), any(), any(Pageable.class))).thenReturn(page);

        Page<WorkReportDto> result = workReportService.getWorkReportList("user01", null, "", pageable);

        assertNotNull(result);
        assertEquals(0, result.getTotalElements());
    }
}
