package nuri.business.domain.memoreport;

import nuri.foundation.core.exception.BusinessException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("MemoReport 엔티티 테스트")
class MemoReportTest {

    @Test
    @DisplayName("MemoReport 생성 및 Getter/Setter 검증")
    void getSetTest() {
        MemoReport report = MemoReport.builder()
                .rptId("R1")
                .rptTtl("Title")
                .memoRptYmd("2026-06-04")
                .userId("user1")
                .rptrId("rptr1")
                .rptCn("Content")
                .build();

        assertThat(report.getRptId()).isEqualTo("R1");
        assertThat(report.getRptTtl()).isEqualTo("Title");
        assertThat(report.getMemoRptYmd()).isEqualTo("2026-06-04");
        assertThat(report.getUserId()).isEqualTo("user1");
        assertThat(report.getRptrId()).isEqualTo("rptr1");
        assertThat(report.getRptCn()).isEqualTo("Content");
    }

    @Test
    @DisplayName("MemoReport update - 정상 포맷")
    void update_success() {
        MemoReport report = MemoReport.builder().build();

        // 1. null 또는 empty 날짜 검증 스킵
        report.update("T", null, "U", "R", "C", "A");
        assertThat(report.getMemoRptYmd()).isNull();

        report.update("T", "", "U", "R", "C", "A");
        assertThat(report.getMemoRptYmd()).isEmpty();

        // 2. 정상 날짜 포맷 (YYYYMMDD 및 YYYY-MM-DD)
        report.update("T", "20260604", "U", "R", "C", "A");
        assertThat(report.getMemoRptYmd()).isEqualTo("20260604");

        report.update("T", "2026-06-04", "U", "R", "C", "A");
        assertThat(report.getMemoRptYmd()).isEqualTo("2026-06-04");
    }

    @Test
    @DisplayName("MemoReport update - 잘못된 포맷 시 예외 발생")
    void update_invalidDateFormat() {
        MemoReport report = MemoReport.builder().build();

        // 8자리가 아닐 때
        assertThatThrownBy(() -> report.update("T", "2026", "U", "R", "C", "A"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("날짜 형식은 8자리 YYYYMMDD 또는 YYYY-MM-DD 여야 합니다.");

        // 유효하지 않은 날짜 값일 때 (예: 13월)
        assertThatThrownBy(() -> report.update("T", "20261304", "U", "R", "C", "A"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("유효하지 않은 날짜 형식입니다");
    }

    @Test
    @DisplayName("MemoReport updateInqireDt - 정상 및 예외 케이스 검증")
    void updateInqireDtTest() {
        MemoReport report = MemoReport.builder().build();

        // null 또는 empty 검증 스킵
        report.updateInqireDt(null);
        assertThat(report.getRptrInqDt()).isNull();

        report.updateInqireDt("");
        assertThat(report.getRptrInqDt()).isEmpty();

        // yyyy-MM-dd HH:mm:ss 포맷
        report.updateInqireDt("2026-06-04 23:45:00");
        assertThat(report.getRptrInqDt()).isEqualTo("2026-06-04 23:45:00");

        // yyyyMMddHHmmss 포맷
        report.updateInqireDt("20260604234500");
        assertThat(report.getRptrInqDt()).isEqualTo("20260604234500");

        // 잘못된 일시 형식
        assertThatThrownBy(() -> report.updateInqireDt("20260604"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("유효하지 않은 일시 형식입니다");
    }

    @Test
    @DisplayName("MemoReport updateDrctMatter - 정상 및 예외 케이스 검증")
    void updateDrctMatterTest() {
        MemoReport report = MemoReport.builder().build();

        // yyyy-MM-dd HH:mm:ss 포맷
        report.updateDrctMatter("Direction", "2026-06-04 23:45:00");
        assertThat(report.getDrctnMttr()).isEqualTo("Direction");
        assertThat(report.getDrctnMttrRegDt()).isEqualTo("2026-06-04 23:45:00");

        // yyyyMMddHHmmss 포맷
        report.updateDrctMatter("Direction", "20260604234500");
        assertThat(report.getDrctnMttrRegDt()).isEqualTo("20260604234500");

        // 잘못된 일시 형식
        assertThatThrownBy(() -> report.updateDrctMatter("Direction", "invalid-date"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("유효하지 않은 일시 형식입니다");
    }
}
