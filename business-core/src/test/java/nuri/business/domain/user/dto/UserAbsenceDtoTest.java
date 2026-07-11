package nuri.business.domain.user.dto;

import nuri.business.domain.user.entity.UserAbsence;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("UserAbsenceDto 테스트")
class UserAbsenceDtoTest {

    @Test
    @DisplayName("엔티티에서 DTO로 변환")
    void fromEntity() {
        // given
        UserAbsence entity = UserAbsence.builder()
                .userId("user01")
                .userAbsnYn("Y")
                .build();

        // when
        UserAbsenceDto dto = UserAbsenceDto.from(entity);

        // then
        assertThat(dto).isNotNull();
        assertThat(dto.userId()).isEqualTo("user01");
        assertThat(dto.userAbsnYn()).isEqualTo("Y");
    }

    @Test
    @DisplayName("Null 변환 테스트")
    void nullTests() {
        assertThat(UserAbsenceDto.from(null)).isNull();
    }
}
