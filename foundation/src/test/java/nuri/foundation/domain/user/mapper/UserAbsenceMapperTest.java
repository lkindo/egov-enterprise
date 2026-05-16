package nuri.foundation.domain.user.mapper;

import nuri.foundation.domain.user.dto.UserAbsenceDto;
import nuri.foundation.domain.user.entity.UserAbsence;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("사용자 부재 정보 매퍼 테스트")
class UserAbsenceMapperTest {

    private final UserAbsenceMapper mapper = UserAbsenceMapper.INSTANCE;

    @Test
    @DisplayName("엔티티에서 DTO로 변환")
    void toDto() {
        // given
        UserAbsence entity = UserAbsence.builder()
                .userId("user01")
                .userAbsnceAt("Y")
                .build();

        // when
        UserAbsenceDto dto = mapper.toDto(entity);

        // then
        assertThat(dto).isNotNull();
        assertThat(dto.getUserId()).isEqualTo("user01");
        assertThat(dto.getUserAbsnceAt()).isEqualTo("Y");
    }

    @Test
    @DisplayName("DTO에서 엔티티로 변환")
    void toEntity() {
        // given
        UserAbsenceDto dto = UserAbsenceDto.builder()
                .userId("user02")
                .userAbsnceAt("N")
                .build();

        // when
        UserAbsence entity = mapper.toEntity(dto);

        // then
        assertThat(entity).isNotNull();
        assertThat(entity.getUserId()).isEqualTo("user02");
        assertThat(entity.getUserAbsnceAt()).isEqualTo("N");
    }

    @Test
    @DisplayName("Null 변환 테스트")
    void nullTests() {
        assertThat(mapper.toDto(null)).isNull();
        assertThat(mapper.toEntity(null)).isNull();
    }
}
