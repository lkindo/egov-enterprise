package nuri.business.service.system.user.impl;

import nuri.business.domain.user.dto.UserAbsenceDto;
import nuri.business.domain.user.dto.UserAbsenceMapper;
import nuri.business.domain.user.dto.UserAbsenceMapperImpl;
import nuri.business.domain.user.entity.UserAbsence;
import nuri.business.domain.user.repository.UserAbsenceRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserAbsenceServiceImpl 단위 테스트")
class UserAbsenceServiceImplTest {

    @InjectMocks
    private UserAbsenceServiceImpl userAbsenceService;

    @Mock
    private UserAbsenceRepository userAbsenceRepository;

    // MapStruct 컴파일타임 생성 구현체를 실제로 주입 (수기 from() 대체 매퍼)
    @Spy
    private UserAbsenceMapper userAbsenceMapper = new UserAbsenceMapperImpl();

    @Test
    @DisplayName("부재 목록 조회 성공")
    void getAbsences_Success() {
        // given
        UserAbsence absence = UserAbsence.builder().userId("user1").userAbsnYn("N").build();
        given(userAbsenceRepository.findAll()).willReturn(List.of(absence));

        // when
        List<UserAbsenceDto> result = userAbsenceService.getAbsences();

        // then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).userId()).isEqualTo("user1");
    }

    @Test
    @DisplayName("부재 정보 상세 조회 성공 - 데이터 있음")
    void getAbsence_Found() {
        // given
        UserAbsence absence = UserAbsence.builder().userId("user1").userAbsnYn("Y").build();
        given(userAbsenceRepository.findById("user1")).willReturn(Optional.of(absence));

        // when
        UserAbsenceDto result = userAbsenceService.getAbsence("user1");

        // then
        assertThat(result.userAbsnYn()).isEqualTo("Y");
    }

    @Test
    @DisplayName("부재 정보 상세 조회 성공 - 데이터 없음 (기본값)")
    void getAbsence_NotFound() {
        // given
        given(userAbsenceRepository.findById("user1")).willReturn(Optional.empty());

        // when
        UserAbsenceDto result = userAbsenceService.getAbsence("user1");

        // then
        assertThat(result.userAbsnYn()).isEqualTo("N");
    }

    @Test
    @DisplayName("부재 정보 수정 성공")
    void updateAbsence_Success() {
        // given
        UserAbsence absence = UserAbsence.builder().userId("user1").build();
        given(userAbsenceRepository.findById("user1")).willReturn(Optional.of(absence));
        UserAbsenceDto dto = UserAbsenceDto.builder().userId("user1").userAbsnYn("Y").build();

        // when
        userAbsenceService.updateAbsence("user1", dto);

        // then
        verify(userAbsenceRepository).save(any());
    }
}
