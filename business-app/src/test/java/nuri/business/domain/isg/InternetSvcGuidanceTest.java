package nuri.business.domain.isg;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

@DisplayName("InternetSvcGuidance 테스트")
class InternetSvcGuidanceTest {

    @Test
    @DisplayName("InternetSvcGuidance 빌더 생성 확인")
    void testBuilder() {
        InternetSvcGuidance guidance = InternetSvcGuidance.builder()
                .itntSvcNm("서비스명")
                .build();

        assertEquals("서비스명", guidance.getItntSvcNm());
    }
}