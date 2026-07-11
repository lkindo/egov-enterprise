package nuri.business.domain.code;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

@DisplayName("CommonCode 테스트")
class CommonCodeTest {

    @Test
    @DisplayName("CommonCode 빌더 생성 확인")
    void testCommonCodeBuilder() {
        CommonCode code = CommonCode.builder()
                .cdId("GROUP01")
                .dtlCd("C001")
                .dtlCdNm("코드명")
                .build();

        assertEquals("C001", code.getDtlCd());
        assertEquals("코드명", code.getDtlCdNm());
    }
}