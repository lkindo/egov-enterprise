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
                .reportId("REPO_001")
                .reportSubject("주간보고")
                .reportContent("내용")
                .writerId("user01")
                .build();

        workReportService.registerWorkReport(dto);

        verify(workReportRepository, times(1)).save(any(WorkReport.class));
    }

    @Test
    @DisplayName("업무보고 수정 테스트")
    void updateWorkReportTest() {
        WorkReportDto dto = WorkReportDto.builder()
                .reportId("REPO_001")
                .reportSubject("수정보고")
                .writerId("user01")
                .build();

        WorkReport report = WorkReport.builder()
                .reportId("REPO_001")
                .reportSubject("주간보고")
                .writerId("user01")
                .build();

        when(workReportRepository.findById("REPO_001")).thenReturn(Optional.of(report));

        workReportService.updateWorkReport(dto);

        assertEquals("수정보고", report.getReportSubject());
    }

    @Test
    @DisplayName("업무보고 삭제 테스트")
    void deleteWorkReportTest() {
        workReportService.deleteWorkReport("REPO_001");

        verify(workReportRepository, times(1)).deleteById("REPO_001");
    }

    @Test
    @DisplayName("업무보고 상세 조회 테스트")
    void getWorkReportTest() {
        WorkReport report = WorkReport.builder()
                .reportId("REPO_001")
                .reportSubject("주간보고")
                .reportContent("내용")
                .writerId("user01")
                .build();

        when(workReportRepository.findById("REPO_001")).thenReturn(Optional.of(report));

        WorkReportDto result = workReportService.getWorkReport("REPO_001");

        assertNotNull(result);
        assertEquals("REPO_001", result.getReportId());
        assertEquals("주간보고", result.getReportSubject());
    }

    @Test
    @DisplayName("업무보고 목록 조회 테스트")
    void getWorkReportListTest() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<WorkReport> page = new PageImpl<>(Collections.emptyList(), pageable, 0);

        when(workReportRepository.searchWorkReports(any(), any(), any(), any(), any(), any(), any(), any(), any(Pageable.class))).thenReturn(page);

        Page<WorkReportDto> result = workReportService.getWorkReportList("user01", "", pageable);

        assertNotNull(result);
        assertEquals(0, result.getTotalElements());
    }
}
