package nuri.foundation.domain.code;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

@DisplayName("InstitutionCode 테스트")
class InstitutionCodeTest {

    @Test
    @DisplayName("InstitutionCode 빌더 생성 확인")
    void testInstitutionCodeBuilder() {
        InstitutionCode code = InstitutionCode.builder()
                .insttCode("I001")
                .allInsttNm("기관명")
                .build();

        assertEquals("I001", code.getInsttCode());
        assertEquals("기관명", code.getAllInsttNm());
    }
}