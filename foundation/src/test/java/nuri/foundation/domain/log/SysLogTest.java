package nuri.foundation.domain.log;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

@DisplayName("SysLog 도메인 테스트")
class SysLogTest {

    @Test
    @DisplayName("SysLog 빌더 확인")
    void testBuilder() {
        SysLog log = SysLog.builder()
                .srvcNm("DeptService")
                .methodNm("selectDept")
                .build();

        assertEquals("DeptService", log.getSrvcNm());
    }
}