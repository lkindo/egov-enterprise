package nuri.business.service.schedule;

import nuri.business.domain.schedule.Schedule;
import nuri.business.domain.schedule.ScheduleRepository;
import nuri.business.service.schedule.dto.ScheduleDto;
import nuri.business.service.schedule.dto.ScheduleMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@DisplayName("ScheduleService 단위 테스트")
class ScheduleServiceTest {

    private org.mockito.MockedStatic<nuri.business.security.util.SecurityUtil> __secUtilMock;
    @org.junit.jupiter.api.BeforeEach
    void __openSecUtilMock() { __secUtilMock = org.mockito.Mockito.mockStatic(nuri.business.security.util.SecurityUtil.class); }
    @org.junit.jupiter.api.AfterEach
    void __closeSecUtilMock() { if (__secUtilMock != null) __secUtilMock.close(); }

    @Mock
    private ScheduleRepository scheduleRepository;

    @Mock
    private ScheduleMapper scheduleMapper;

    /** 담당자/부서 귀속을 서버가 정하면서 소속 조직 조회가 필요해졌다. 미스텁 시 Optional.empty() → 기본조직 폴백. */
    @Mock
    private nuri.business.domain.user.repository.UserRepository userRepository;

    @InjectMocks
    private ScheduleService scheduleService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    @DisplayName("일정 목록 조회")
    void getScheduleList() {
        // given
        Pageable pageable = PageRequest.of(0, 10);
        Schedule entity = Schedule.builder().schdlId("S1").schdlNm("Test Schedule").build();
        given(scheduleRepository.searchSchedules(any(), any(), any(), any())).willReturn(new PageImpl<>(List.of(entity)));
        given(scheduleMapper.toDto(any())).willReturn(
                ScheduleDto.builder().schdlId("S1").schdlNm("Test Schedule").build());

        // when
        Page<ScheduleDto> result = scheduleService.getScheduleList(null, pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getSchdlNm()).isEqualTo("Test Schedule");
    }

    @Test
    @DisplayName("일정 상세 조회")
    void getSchedule() {
        // given
        String schdulId = "S1";
        Schedule entity = Schedule.builder().schdlId(schdulId).schdlNm("Test Schedule").build();
        given(scheduleRepository.findById(schdulId)).willReturn(Optional.of(entity));
        given(scheduleMapper.toDto(any())).willReturn(
                ScheduleDto.builder().schdlId(schdulId).schdlNm("Test Schedule").build());

        // when
        ScheduleDto result = scheduleService.getSchedule(schdulId);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getSchdlId()).isEqualTo(schdulId);
    }

    @Test
    @DisplayName("일정 생성 — PK·담당자·부서는 서버가 정하고 클라이언트 값은 무시한다")
    void createSchedule() {
        // given: 클라이언트가 PK 와 담당자, 부서를 위조해 보낸 상황
        String loginId = "user1";
        ScheduleDto dto = ScheduleDto.builder()
                .schdlId("FORGED_PK")
                .schdlPicId("attacker")
                .schdlDeptId("OTHER_DEPT")
                .schdlNm("New Schedule")
                .schdlSeCd("1")
                .build();
        given(userRepository.findByUserId(loginId)).willReturn(Optional.empty()); // 조직 미배정 → 기본조직 폴백

        // when
        String newId = scheduleService.createSchedule(loginId, dto);

        // then
        org.mockito.ArgumentCaptor<Schedule> captor = org.mockito.ArgumentCaptor.forClass(Schedule.class);
        verify(scheduleRepository).save(captor.capture());
        Schedule saved = captor.getValue();

        // PK 는 서버 채번 (클라이언트가 보낸 FORGED_PK 를 쓰지 않는다)
        assertThat(saved.getSchdlId()).isNotEqualTo("FORGED_PK").startsWith("SCHDL_");
        assertThat(newId).isEqualTo(saved.getSchdlId());
        // 담당자는 인증 주체로 고정 (매스어사인먼트 차단)
        assertThat(saved.getSchdlPicId()).isEqualTo(loginId);
        // 부서도 서버가 결정 (미배정이므로 기본조직)
        assertThat(saved.getSchdlDeptId()).isEqualTo("ORGNZT_0000000000000");
    }

    @Test
    @DisplayName("일정 수정")
    void updateSchedule() {
        // given
        String schdulId = "S1";
        String userId = "user1";
        Schedule existingEntity = Schedule.builder().schdlId(schdulId).schdlNm("Old Title").build();
        ScheduleDto updateDto = ScheduleDto.builder()
                .schdlId(schdulId)
                .schdlNm("New Title")
                .build();

        given(scheduleRepository.findById(schdulId)).willReturn(Optional.of(existingEntity));

        // when
        scheduleService.updateSchedule(schdulId, userId, updateDto);

        // then
        assertThat(existingEntity.getSchdlNm()).isEqualTo("New Title");
    }

    @Test
    @DisplayName("일정 삭제")
    void deleteSchedule() {
        // given
        String schdulId = "S1";
        String userId = "user1";
        Schedule entity = Schedule.builder().schdlId(schdulId).build();
        entity.setFrstRgtrId(userId); // 감사 필드는 빌더 대신 세터로 세팅(테스트 시나리오 구성용)
        given(scheduleRepository.findById(schdulId)).willReturn(Optional.of(entity));

        // when
        scheduleService.deleteSchedule(schdulId, userId);

        // then
        verify(scheduleRepository).delete(entity);
    }

    @Test
    @DisplayName("일정 삭제 - 소유권 가드(SecurityUtil.assertOwnerOrAdmin) 위임 검증")
    void deleteSchedule_delegatesOwnershipGuard() {
        // given — 소유자 loginId=frstRgtrId. 실제 소유권 거부/허용 판정은 SecurityUtilTest 가 검증하고,
        // 여기서는 서비스가 엔티티의 frstRgtrId 로 가드를 '호출'하는지(배선)를 확인한다.
        String schdulId = "S1";
        Schedule entity = Schedule.builder().schdlId(schdulId).build();
        entity.setFrstRgtrId("creator");
        given(scheduleRepository.findById(schdulId)).willReturn(Optional.of(entity));

        // when
        scheduleService.deleteSchedule(schdulId, "otherUser");

        // then — 가드가 소유자 loginId 로 호출됨
        __secUtilMock.verify(() -> nuri.business.security.util.SecurityUtil.assertOwnerOrAdmin("creator"));
    }
}
