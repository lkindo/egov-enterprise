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
                .rptTtl("Weekly Report 1")
                .rptSeCd("1")
                .userId("user1")
                .build();
        workReportRepository.save(report1);

        // 2. 신규 표준 빌더 활용
        WorkReport report2 = WorkReport.builder()
                .rptTtl("Monthly Report")
                .rptSeCd("2")
                .userId("user1")
                .build();
        workReportRepository.save(report2);

        // when
        Page<WorkReport> result = workReportRepository.searchWorkReports("user1", null, null, null, null, "Weekly", null, "1", PageRequest.of(0, 10));

        // then
        assertThat(result.getContent()).hasSize(1);
        // 신규 standard getter
        assertThat(result.getContent().get(0).getRptTtl()).isEqualTo("Weekly Report 1");
    }

    @Test
    @DisplayName("searchCnd=1 이면 내용(rptCn)을 검색하고 그 외에는 제목(rptTtl)을 검색한다")
    void searchWorkReports_filtersByContentWhenSearchCndIsOne() {
        workReportRepository.save(WorkReport.builder()
                .rptTtl("제목 Alpha")
                .rptCn("본문 키워드 Beta 포함")
                .rptSeCd("1")
                .userId("user1")
                .build());
        workReportRepository.save(WorkReport.builder()
                .rptTtl("제목 Beta")
                .rptCn("본문 다른 내용")
                .rptSeCd("1")
                .userId("user1")
                .build());

        Page<WorkReport> byContent = workReportRepository.searchWorkReports(
                "user1", null, null, null, "1", "Beta", null, null, PageRequest.of(0, 10));
        Page<WorkReport> byTitle = workReportRepository.searchWorkReports(
                "user1", null, null, null, "0", "Beta", null, null, PageRequest.of(0, 10));

        assertThat(byContent.getContent()).extracting(WorkReport::getRptTtl).containsExactly("제목 Alpha");
        assertThat(byTitle.getContent()).extracting(WorkReport::getRptTtl).containsExactly("제목 Beta");
    }
}
