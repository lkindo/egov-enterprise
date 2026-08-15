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
                .memoRptSn(1L)
                .rptTtl("Title")
                .memoRptYmd("2026-06-04")
                .userId("user1")
                .rptrId("rptr1")
                .rptCn("Content")
                .build();

        assertThat(report.getMemoRptSn()).isEqualTo(1L);
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
        report.update("T", null, "U", "R", "C", 101L);
        assertThat(report.getMemoRptYmd()).isNull();

        report.update("T", "", "U", "R", "C", 101L);
        assertThat(report.getMemoRptYmd()).isEmpty();

        // 2. 정상 날짜 포맷 (YYYYMMDD 및 YYYY-MM-DD)
        report.update("T", "20260604", "U", "R", "C", 101L);
        assertThat(report.getMemoRptYmd()).isEqualTo("20260604");

        report.update("T", "2026-06-04", "U", "R", "C", 101L);
        assertThat(report.getMemoRptYmd()).isEqualTo("2026-06-04");
    }

    @Test
    @DisplayName("MemoReport update - 잘못된 포맷 시 예외 발생")
    void update_invalidDateFormat() {
        MemoReport report = MemoReport.builder().build();

        // 8자리가 아닐 때
        assertThatThrownBy(() -> report.update("T", "2026", "U", "R", "C", 101L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("날짜 형식은 8자리 YYYYMMDD 또는 YYYY-MM-DD 여야 합니다.");

        // 유효하지 않은 날짜 값일 때 (예: 13월)
        assertThatThrownBy(() -> report.update("T", "20261304", "U", "R", "C", 101L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("유효하지 않은 날짜 형식입니다");
    }

    @Test
    @DisplayName("MemoReport updateInqireDt - LocalDateTime 설정 검증 (V2_18 timestamp 동기화)")
    void updateInqireDtTest() {
        MemoReport report = MemoReport.builder().build();

        // null 허용 (미조회 상태)
        report.updateInqireDt(null);
        assertThat(report.getRptrInqDt()).isNull();

        // LocalDateTime 설정
        java.time.LocalDateTime inqDt = java.time.LocalDateTime.of(2026, 6, 4, 23, 45, 0);
        report.updateInqireDt(inqDt);
        assertThat(report.getRptrInqDt()).isEqualTo(inqDt);
    }

    @Test
    @DisplayName("MemoReport updateDrctMatter - LocalDateTime 설정 검증 (V2_18 timestamp 동기화)")
    void updateDrctMatterTest() {
        MemoReport report = MemoReport.builder().build();

        java.time.LocalDateTime regDt = java.time.LocalDateTime.of(2026, 6, 4, 23, 45, 0);
        report.updateDrctMatter("Direction", regDt);
        assertThat(report.getDrctnMttr()).isEqualTo("Direction");
        assertThat(report.getDrctnMttrRegDt()).isEqualTo(regDt);

        // 지시일시 null 허용
        report.updateDrctMatter("Direction2", null);
        assertThat(report.getDrctnMttr()).isEqualTo("Direction2");
        assertThat(report.getDrctnMttrRegDt()).isNull();
    }
}
