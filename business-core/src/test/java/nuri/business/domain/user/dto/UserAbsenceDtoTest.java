package nuri.business.domain.user.dto;

import nuri.business.domain.user.entity.UserAbsence;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("UserAbsenceDto 매퍼 테스트")
class UserAbsenceDtoTest {

    // 수기 from() 대체: MapStruct 컴파일타임 생성 구현체
    private final UserAbsenceMapper mapper = new UserAbsenceMapperImpl();

    @Test
    @DisplayName("엔티티에서 DTO로 변환")
    void fromEntity() {
        // given
        UserAbsence entity = UserAbsence.builder()
                .userId("user01")
                .userAbsnYn("Y")
                .build();

        // when
        UserAbsenceDto dto = mapper.toDto(entity);

        // then
        assertThat(dto).isNotNull();
        assertThat(dto.userId()).isEqualTo("user01");
        assertThat(dto.userAbsnYn()).isEqualTo("Y");
    }

    @Test
    @DisplayName("Null 변환 테스트")
    void nullTests() {
        assertThat(mapper.toDto(null)).isNull();
    }
}
