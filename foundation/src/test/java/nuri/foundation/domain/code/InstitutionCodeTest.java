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
                .instCd("I001")
                .allInstNm("기관명")
                .build();

        assertEquals("I001", code.getInstCd());
        assertEquals("기관명", code.getAllInstNm());
    }
}