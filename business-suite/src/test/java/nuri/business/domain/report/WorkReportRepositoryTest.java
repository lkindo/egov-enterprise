package nuri.business.domain.report;

import nuri.business.support.PersistenceTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import static org.assertj.core.api.Assertions.assertThat;

class WorkReportRepositoryTest extends PersistenceTestSupport {

    @Autowired
    private WorkReportRepository workReportRepository;

    @Test
    @DisplayName("작업보고 저장 및 검색")
    void saveAndSearchWorkReports() {
        // given
        // 1. 신규 표준 필드 빌더 활용
        WorkReport report1 = WorkReport.builder()
                .rptId("R1")
                .rptTtl("Weekly Report 1")
                .rptSeCd("1")
                .userId("user1")
                .build();
        workReportRepository.save(report1);

        // 2. 하위 호환용 레거시 필드 빌더 활용
        WorkReport report2 = WorkReport.builder()
                .reportId("R2")
                .reportSubject("Monthly Report")
                .reprtSe("2")
                .wrterId("user1")
                .build();
        workReportRepository.save(report2);

        // when
        Page<WorkReport> result = workReportRepository.searchWorkReports("user1", null, null, null, null, "Weekly", null, "1", PageRequest.of(0, 10));

        // then
        assertThat(result.getContent()).hasSize(1);
        // 신규 standard getter
        assertThat(result.getContent().get(0).getRptTtl()).isEqualTo("Weekly Report 1");
        // 하위 호환 legacy getter
        assertThat(result.getContent().get(0).getReportSubject()).isEqualTo("Weekly Report 1");
    }
}
