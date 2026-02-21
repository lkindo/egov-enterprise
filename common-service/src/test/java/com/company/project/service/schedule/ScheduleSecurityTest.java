package com.company.project.service.schedule;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.schedule.Schedule;
import com.company.project.domain.schedule.ScheduleRepository;
import com.company.project.service.schedule.dto.ScheduleDto;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ScheduleSecurityTest {

    @Mock
    private ScheduleRepository scheduleRepository;

    @InjectMocks
    private ScheduleService scheduleService;

    @Test
    @DisplayName("Should prevent updating schedule if user is not the owner")
    void shouldPreventUpdateIfNotOwner() {
        // Given
        String scheduleId = "SCH_001";
        String ownerId = "user_owner";
        String attackerId = "user_attacker";

        Schedule mockSchedule = mock(Schedule.class);
        when(mockSchedule.getFrstRegisterId()).thenReturn(ownerId);

        when(scheduleRepository.findById(scheduleId)).thenReturn(Optional.of(mockSchedule));

        ScheduleDto dto = ScheduleDto.builder().build();

        // When & Then
        BusinessException exception = Assertions.assertThrows(BusinessException.class, () -> {
            scheduleService.updateSchedule(scheduleId, attackerId, dto);
        });

        Assertions.assertEquals(ErrorCode.ACCESS_DENIED, exception.getErrorCode());
        // Verify update is NEVER called on the schedule object
        verify(mockSchedule, never()).update(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("Should allow updating schedule if user is the owner")
    void shouldAllowUpdateIfOwner() {
        // Given
        String scheduleId = "SCH_001";
        String ownerId = "user_owner";

        Schedule mockSchedule = mock(Schedule.class);
        when(mockSchedule.getFrstRegisterId()).thenReturn(ownerId);

        when(scheduleRepository.findById(scheduleId)).thenReturn(Optional.of(mockSchedule));

        ScheduleDto dto = ScheduleDto.builder().build();

        // When
        scheduleService.updateSchedule(scheduleId, ownerId, dto);

        // Then
        verify(mockSchedule).update(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("Should prevent deleting schedule if user is not the owner")
    void shouldPreventDeleteIfNotOwner() {
        // Given
        String scheduleId = "SCH_001";
        String ownerId = "user_owner";
        String attackerId = "user_attacker";

        Schedule mockSchedule = mock(Schedule.class);
        when(mockSchedule.getFrstRegisterId()).thenReturn(ownerId);

        when(scheduleRepository.findById(scheduleId)).thenReturn(Optional.of(mockSchedule));

        // When & Then
        BusinessException exception = Assertions.assertThrows(BusinessException.class, () -> {
            scheduleService.deleteSchedule(scheduleId, attackerId);
        });

        Assertions.assertEquals(ErrorCode.ACCESS_DENIED, exception.getErrorCode());
        verify(scheduleRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Should allow deleting schedule if user is the owner")
    void shouldAllowDeleteIfOwner() {
        // Given
        String scheduleId = "SCH_001";
        String ownerId = "user_owner";

        Schedule mockSchedule = mock(Schedule.class);
        when(mockSchedule.getFrstRegisterId()).thenReturn(ownerId);

        when(scheduleRepository.findById(scheduleId)).thenReturn(Optional.of(mockSchedule));

        // When
        scheduleService.deleteSchedule(scheduleId, ownerId);

        // Then
        verify(scheduleRepository).delete(mockSchedule);
    }
}
