package nuri.business.service.schedule;

import nuri.business.domain.schedule.Schedule;
import nuri.business.domain.schedule.ScheduleRepository;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.file.AttachmentAssignmentPolicy;
import nuri.business.service.schedule.dto.ScheduleDto;
import nuri.business.service.schedule.dto.ScheduleMapper;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** SecurityUtil을 모킹하지 않고 실제 loginId 소유권 및 관리자 예외를 검증한다. */
@ExtendWith(MockitoExtension.class)
class ScheduleAccessTest {
    @Mock ScheduleRepository repository;
    @Mock ScheduleMapper mapper;
    @Mock UserRepository users;
    @Mock AttachmentAssignmentPolicy attachments;
    @InjectMocks ScheduleService service;

    @AfterEach void clearAuthentication() { SecurityContextHolder.clearContext(); }

    @ParameterizedTest
    @CsvSource({"owner,USER,true", "other,ADMIN,true", "other,USER,false", "anonymous,USER,false"})
    void detailUpdateAndDeleteRespectRealOwnership(String loginId, String role, boolean allowed) {
        if (!loginId.equals("anonymous")) {
            var principal = CustomUserDetails.builder().userId(loginId).esntlId("different-internal-id").build();
            SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                    principal, null, List.of(new SimpleGrantedAuthority("ROLE_" + role))));
        }
        var schedule = Schedule.builder().schdlSn(1L).schdlNm("original").schdlPicId("owner").build();
        schedule.setFrstRgtrId("owner");
        when(repository.findById(1L)).thenReturn(Optional.of(schedule));
        var update = ScheduleDto.builder().schdlNm("updated").schdlPicId("forged").build();
        if (allowed) {
            when(mapper.toDto(schedule)).thenReturn(ScheduleDto.builder().schdlSn(1L).build());
            assertThat(service.getSchedule(1L).getSchdlSn()).isEqualTo(1L);
            service.updateSchedule(1L, loginId, update);
            assertThat(schedule.getSchdlNm()).isEqualTo("updated");
            assertThat(schedule.getSchdlPicId()).isEqualTo("owner");
            service.deleteSchedule(1L, loginId);
            verify(repository).delete(schedule);
        } else {
            assertThatThrownBy(() -> service.getSchedule(1L)).isInstanceOf(BusinessException.class);
            assertThatThrownBy(() -> service.updateSchedule(1L, loginId, update)).isInstanceOf(BusinessException.class);
            assertThatThrownBy(() -> service.deleteSchedule(1L, loginId)).isInstanceOf(BusinessException.class);
            assertThat(schedule.getSchdlNm()).isEqualTo("original");
            verify(repository, never()).delete(any());
            verifyNoInteractions(mapper);
        }
    }

    @ParameterizedTest
    @CsvSource({"DEPT1,DEPT1", "'',ORGNZT_0000000000000"})
    void departmentAndMonthlyQueriesUseResolvedMembership(String department, String expected) {
        when(users.findByUserId("owner")).thenReturn(Optional.of(User.builder().userId("owner").ognzId(department).build()));
        when(repository.searchDeptSchedules(any(), any(), any(), any())).thenReturn(Page.empty());
        assertThat(service.getDeptScheduleList("1", "owner", "search", PageRequest.of(0, 10))).isEmpty();
        assertThat(service.getMonthlySchedule("owner", "202609")).isEmpty();
        verify(repository).searchDeptSchedules(eq("1"), eq(expected), eq("search"), any());
        verify(repository).findMonthlySchedules("owner", expected, "202609");
    }

    @Test
    void missingMembershipUsesDefaultDepartment() {
        when(repository.searchDeptSchedules(any(), any(), any(), any())).thenReturn(Page.empty());
        service.getDeptScheduleList("1", "missing", null, PageRequest.of(0, 10));
        verify(repository).searchDeptSchedules(eq("1"), eq("ORGNZT_0000000000000"), isNull(), any());
    }

    @ParameterizedTest
    @org.junit.jupiter.params.provider.NullAndEmptySource
    @org.junit.jupiter.params.provider.ValueSource(strings = {"   "})
    void absentLoginUsesDefaultDepartmentWithoutLookingUpUser(String loginId) {
        when(repository.searchDeptSchedules(any(), any(), any(), any())).thenReturn(Page.empty());
        service.getDeptScheduleList("1", loginId, null, PageRequest.of(0, 10));
        verify(repository).searchDeptSchedules(eq("1"), eq("ORGNZT_0000000000000"), isNull(), any());
        verifyNoInteractions(users);
    }

    @Test
    void absentRecordsFailAndDateRangesPreserveOwnerScope() {
        assertThatThrownBy(() -> service.getSchedule(99L)).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.updateSchedule(99L, "owner", ScheduleDto.builder().build())).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.deleteSchedule(99L, "owner")).isInstanceOf(BusinessException.class);
        assertThat(service.getScheduleListByDateRange("owner", "20260901", "20260930")).isEmpty();
        assertThat(service.getScheduleListByDateRange("1", "owner", "20260901", "20260930")).isEmpty();
        verify(repository).findSchedulesByDateRange("owner", "20260901", "20260930");
        verify(repository).findSchedulesByDateRange("1", "owner", "20260901", "20260930");
        verify(repository, never()).delete(any());
    }
}
