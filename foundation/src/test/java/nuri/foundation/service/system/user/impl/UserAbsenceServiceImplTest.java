package nuri.foundation.service.system.user.impl;

import nuri.foundation.domain.user.dto.UserAbsenceDto;
import nuri.foundation.domain.user.entity.UserAbsence;
import nuri.foundation.domain.user.mapper.UserAbsenceMapper;
import nuri.foundation.domain.user.repository.UserAbsenceRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
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

    @Mock
    private UserAbsenceMapper userAbsenceMapper;

    @Test
    @DisplayName("부재 목록 조회 성공")
    void getAbsences_Success() {
        // given
        UserAbsence absence = UserAbsence.builder().emplyrId("user1").build();
        given(userAbsenceRepository.findAll()).willReturn(List.of(absence));
        given(userAbsenceMapper.toDtoList(any())).willReturn(List.of(UserAbsenceDto.builder().emplyrId("user1").build()));

        // when
        List<UserAbsenceDto> result = userAbsenceService.getAbsences();

        // then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getEmplyrId()).isEqualTo("user1");
    }

    @Test
    @DisplayName("부재 정보 상세 조회 성공 - 데이터 있음")
    void getAbsence_Found() {
        // given
        UserAbsence absence = UserAbsence.builder().emplyrId("user1").userAbsnceAt("Y").build();
        given(userAbsenceRepository.findById("user1")).willReturn(Optional.of(absence));
        given(userAbsenceMapper.toDto(any())).willReturn(UserAbsenceDto.builder().emplyrId("user1").userAbsnceAt("Y").build());

        // when
        UserAbsenceDto result = userAbsenceService.getAbsence("user1");

        // then
        assertThat(result.getUserAbsnceAt()).isEqualTo("Y");
    }

    @Test
    @DisplayName("부재 정보 상세 조회 성공 - 데이터 없음 (기본값)")
    void getAbsence_NotFound() {
        // given
        given(userAbsenceRepository.findById("user1")).willReturn(Optional.empty());
        given(userAbsenceMapper.toDto(any())).willAnswer(inv -> {
            UserAbsence a = inv.getArgument(0);
            return UserAbsenceDto.builder().emplyrId(a.getEmplyrId()).userAbsnceAt(a.getUserAbsnceAt()).build();
        });

        // when
        UserAbsenceDto result = userAbsenceService.getAbsence("user1");

        // then
        assertThat(result.getUserAbsnceAt()).isEqualTo("N");
    }

    @Test
    @DisplayName("부재 정보 수정 성공")
    void updateAbsence_Success() {
        // given
        UserAbsence absence = UserAbsence.builder().emplyrId("user1").build();
        given(userAbsenceRepository.findById("user1")).willReturn(Optional.of(absence));
        UserAbsenceDto dto = UserAbsenceDto.builder().userAbsnceAt("Y").build();

        // when
        userAbsenceService.updateAbsence("user1", dto);

        // then
        verify(userAbsenceRepository).save(any());
    }
}
