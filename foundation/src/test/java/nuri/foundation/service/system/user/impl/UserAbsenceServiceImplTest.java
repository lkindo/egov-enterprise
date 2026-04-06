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
import static org.mockito.Mockito.times;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
@DisplayName("UserAbsenceServiceImpl 단위 테스트")
class UserAbsenceServiceImplTest {

    @InjectMocks
    private UserAbsenceServiceImpl userAbsenceService;

    @Mock
    private UserAbsenceRepository userAbsenceRepository;

    @Mock
    private UserAbsenceMapper userAbsenceMapper;

    @Test
    @DisplayName("부재자 목록 조회")
    void getAbsences() {
        // given
        UserAbsence absence = UserAbsence.builder().emplyrId("user1").userAbsnceAt("Y").build();
        UserAbsenceDto dto = UserAbsenceDto.builder()
                .emplyrId("user1")
                .userAbsnceAt("Y")
                .build();

        given(userAbsenceRepository.findAll()).willReturn(List.of(absence));
        given(userAbsenceMapper.toDtoList(any())).willReturn(List.of(dto));

        // when
        List<UserAbsenceDto> result = userAbsenceService.getAbsences();

        // then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getEmplyrId()).isEqualTo("user1");
    }

    @Test
    @DisplayName("부재자 단건 조회 - 존재할 때")
    void getAbsence_Exists() {
        // given
        String emplyrId = "user1";
        UserAbsence absence = UserAbsence.builder().emplyrId(emplyrId).userAbsnceAt("Y").build();
        UserAbsenceDto dto = UserAbsenceDto.builder()
                .emplyrId(emplyrId)
                .userAbsnceAt("Y")
                .build();

        given(userAbsenceRepository.findById(emplyrId)).willReturn(Optional.of(absence));
        given(userAbsenceMapper.toDto(any(UserAbsence.class))).willReturn(dto);

        // when
        UserAbsenceDto result = userAbsenceService.getAbsence(emplyrId);

        // then
        assertThat(result.getEmplyrId()).isEqualTo(emplyrId);
        assertThat(result.getUserAbsnceAt()).isEqualTo("Y");
    }

    @Test
    @DisplayName("부재자 단건 조회 - 존재하지 않을 때 (기본값 반환)")
    void getAbsence_NotExists() {
        // given
        String emplyrId = "user99";
        UserAbsenceDto dto = UserAbsenceDto.builder()
                .emplyrId(emplyrId)
                .userAbsnceAt("N")
                .build();

        given(userAbsenceRepository.findById(emplyrId)).willReturn(Optional.empty());
        given(userAbsenceMapper.toDto(any(UserAbsence.class))).willReturn(dto);

        // when
        UserAbsenceDto result = userAbsenceService.getAbsence(emplyrId);

        // then
        assertThat(result.getEmplyrId()).isEqualTo(emplyrId);
        assertThat(result.getUserAbsnceAt()).isEqualTo("N");
    }

    @Test
    @DisplayName("부재자 상태 업데이트 - 기존 데이터 있을 때")
    void updateAbsence_Exists() {
        // given
        String emplyrId = "user1";
        UserAbsence absence = UserAbsence.builder().emplyrId(emplyrId).userAbsnceAt("N").build();
        UserAbsenceDto dto = UserAbsenceDto.builder()
                .userAbsnceAt("Y")
                .build();

        given(userAbsenceRepository.findById(emplyrId)).willReturn(Optional.of(absence));

        // when
        userAbsenceService.updateAbsence(emplyrId, dto);

        // then
        assertThat(absence.getUserAbsnceAt()).isEqualTo("Y");
        verify(userAbsenceRepository, times(1)).save(absence);
    }

    @Test
    @DisplayName("부재자 상태 업데이트 - 기존 데이터 없을 때")
    void updateAbsence_NotExists() {
        // given
        String emplyrId = "user99";
        UserAbsenceDto dto = UserAbsenceDto.builder()
                .userAbsnceAt("Y")
                .build();

        given(userAbsenceRepository.findById(emplyrId)).willReturn(Optional.empty());

        // when
        userAbsenceService.updateAbsence(emplyrId, dto);

        // then
        verify(userAbsenceRepository, times(1)).save(any(UserAbsence.class));
    }
}
