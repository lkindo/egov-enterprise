package nuri.foundation.domain.user.entity;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

@DisplayName("UserAbsence 엔티티 테스트")
class UserAbsenceTest {

    @Test
    @DisplayName("사용자 부재 빌더 확인")
    void testBuilder() {
        UserAbsence absence = UserAbsence.builder()
                .userId("user01")
                .userAbsnYn("Y")
                .build();

        assertEquals("user01", absence.getUserId());
    }
}