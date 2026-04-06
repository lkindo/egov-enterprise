package nuri.foundation.domain.log;
 
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
 
import static org.junit.jupiter.api.Assertions.*;
 
@DisplayName("SysLogSummary 도메인 테스트")
class SysLogSummaryTest {
 
    @Test
    @DisplayName("SysLogSummary 생성 테스트")
    void testSysLogSummaryCreation() {
        // Given
        SysLogSummary summary = SysLogSummary.builder()
                .occrrncDe("20240101")
                .srvcNm("TestService")
                .methodNm("testMethod")
                .creatCo(10L)
                .updtCo(5L)
                .rdcnt(100L)
                .deleteCo(2L)
                .build();
 
        // Then
        assertNotNull(summary);
        assertEquals("20240101", summary.getOccrrncDe());
        assertEquals("TestService", summary.getSrvcNm());
        assertEquals(10L, summary.getCreatCo());
    }
}