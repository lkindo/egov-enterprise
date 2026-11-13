package nuri.business.service.schedule;

import nuri.business.domain.schedule.Schedule;
import nuri.business.domain.schedule.ScheduleRepository;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.file.AttachmentAssignmentPolicy;
import nuri.business.service.schedule.dto.ScheduleDto;
import nuri.business.service.schedule.dto.ScheduleMapper;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.CALLS_REAL_METHODS;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * [V2_152] 전사 일정('3') — 로그인 사용자 모두가 읽고, 만들고 고치고 지우는 일은 일정 수정·삭제 대행 권한 보유자만 한다(H3).
 * 등록자라도 대행 권한이 없으면 전사 일정을 고치지 못하고, 일반 사용자는 자기 일정을 전사로 바꾸지 못한다.
 */
@DisplayName("전사 일정 공유·쓰기 권한 계약")
class ScheduleCompanyWideTest {
    private ScheduleRepository repository;
    private ScheduleService service;
    private MockedStatic<SecurityUtil> security;

    @BeforeEach
    void setUp() {
        repository = mock(ScheduleRepository.class);
        ScheduleMapper mapper = mock(ScheduleMapper.class);
        when(mapper.toDto(any(Schedule.class))).thenAnswer(invocation -> ScheduleDto.builder()
                .schdlSn(invocation.<Schedule>getArgument(0).getSchdlSn()).build());
        UserRepository users = mock(UserRepository.class);
        when(users.findByUserId(anyString())).thenReturn(Optional.empty());
        service = new ScheduleService(repository, mapper, users, mock(AttachmentAssignmentPolicy.class));
        security = mockStatic(SecurityUtil.class, CALLS_REAL_METHODS);
        security.when(SecurityUtil::getCurrentLoginId).thenReturn(Optional.of("viewer"));
        permissions("SCHEDULE_CREATE", "SCHEDULE_UPDATE", "SCHEDULE_DELETE");
    }

    @AfterEach
    void tearDown() {
        security.close();
    }

    private void permissions(String... held) {
        Set<String> granted = Set.of(held);
        security.when(() -> SecurityUtil.hasPermission(anyString()))
                .thenAnswer(invocation -> granted.contains(invocation.<String>getArgument(0)));
    }

    private Schedule stored(String scope, String owner) {
        Schedule schedule = Schedule.builder().schdlSn(1L).schdlNm("전사 행사").schdlSeCd(scope).schdlDeptId("DEPT1")
                .schdlBgngYmd("20261120").build();
        schedule.setFrstRgtrId(owner);
        ReflectionTestUtils.setField(schedule, "version", 0);
        when(repository.findById(anyLong())).thenReturn(Optional.of(schedule));
        return schedule;
    }

    private static ScheduleDto request(String scope) {
        return ScheduleDto.builder().schdlNm("전사 행사").schdlSeCd(scope).schdlBgngYmd("20261120").version(0).build();
    }

    private static CommonErrorCode code(Runnable call) {
        try {
            call.run();
        } catch (BusinessException e) {
            return (CommonErrorCode) e.getErrorCode();
        }
        throw new AssertionError("BusinessException expected");
    }

    @Test
    @DisplayName("로그인 사용자는 다른 부서의 전사 일정도 읽는다")
    void everyLoggedInUserReadsCompanyWideSchedule() {
        stored("3", "admin");
        assertThatCode(() -> service.getSchedule(1L)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("일반 사용자는 전사 일정을 만들지 못한다(403) — 대행 권한 보유자는 만든다")
    void onlyDelegatedManagerCreatesCompanyWideSchedule() {
        assertThat(code(() -> service.createSchedule("viewer", request("3")))).isEqualTo(CommonErrorCode.ACCESS_DENIED);
        verify(repository, never()).save(any());

        permissions("SCHEDULE_CREATE", "SCHEDULE_UPDATE_ALL");
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        assertThatCode(() -> service.createSchedule("viewer", request("3"))).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("등록자라도 대행 권한이 없으면 전사 일정을 고치거나 지우지 못한다 — 자기 일정을 전사로 바꾸지도 못한다")
    void ownerWithoutDelegationCannotModifyCompanyWideSchedule() {
        stored("3", "viewer");
        assertThat(code(() -> service.updateSchedule(1L, "viewer", request("3")))).isEqualTo(CommonErrorCode.ACCESS_DENIED);
        assertThat(code(() -> service.deleteSchedule(1L, "viewer"))).isEqualTo(CommonErrorCode.ACCESS_DENIED);
        verify(repository, never()).delete(any());

        stored("2", "viewer");
        assertThat(code(() -> service.updateSchedule(1L, "viewer", request("3")))).isEqualTo(CommonErrorCode.ACCESS_DENIED);
    }

    @Test
    @DisplayName("모르는 공유 범위는 400")
    void unknownScopeIsRejected() {
        assertThat(code(() -> service.createSchedule("viewer", request("9")))).isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
    }
}
