package com.company.project.service.backup;

import com.company.project.domain.backup.BackupOpert;
import com.company.project.domain.backup.BackupOpertRepository;
import com.company.project.domain.backup.BackupSchdulDfk;
import com.company.project.domain.backup.BackupSchdulDfkRepository;
import com.company.project.service.backup.dto.BackupOpertDto;
import com.company.project.service.code.EgovCommonCodeService;
import com.company.project.service.code.dto.CommonCodeDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.ArrayList;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BackupOpertServiceTest {

    @Mock
    private BackupOpertRepository backupOpertRepository;

    @Mock
    private BackupSchdulDfkRepository backupSchdulDfkRepository;

    @Mock
    private EgovCommonCodeService commonCodeService;

    @InjectMocks
    private BackupOpertService backupOpertService;

    @Test
    @DisplayName("Performance Test: getBackupOpertList calls commonCodeService for Weekly codes repeatedly")
    void testFormatSchedulePerformance() {
        // Given
        int recordCount = 5;
        List<BackupOpert> entities = new ArrayList<>();
        for (int i = 0; i < recordCount; i++) {
            BackupOpert entity = BackupOpert.builder()
                    .backupOpertId("ID_" + i)
                    .backupOpertNm("Backup " + i)
                    .backupOrginlDrctry("/src")
                    .backupStreDrctry("/dest")
                    .cmprsSe("01")
                    .executCycle("02") // Weekly
                    .executSchdulHour("01")
                    .executSchdulMnt("00")
                    .executSchdulSecnd("00")
                    .useAt("Y")
                    .build();

            // Add schedule dfk
            BackupSchdulDfk dfk = BackupSchdulDfk.builder()
                    .backupOpertId(entity.getBackupOpertId())
                    .executSchdulDfkSe("1") // Mon
                    .backupOpert(entity)
                    .build();
            entity.getExecutSchdulDfkSes().add(dfk);

            entities.add(entity);
        }

        Page<BackupOpert> page = new PageImpl<>(entities);
        when(backupOpertRepository.searchBackupOperts(any(), any(), any())).thenReturn(page);

        List<BackupSchdulDfk> allDfks = new ArrayList<>();
        for (BackupOpert entity : entities) {
            allDfks.addAll(entity.getExecutSchdulDfkSes());
        }
        when(backupSchdulDfkRepository.findByBackupOpertIdIn(anyList())).thenReturn(allDfks);

        // Mock Cycle Codes (COM047)
        List<CommonCodeDto> cycleCodes = List.of(
            new CommonCodeDto("COM047", "02", "Weekly", "Weekly Cycle", "Y")
        );
        when(commonCodeService.getCodesByGroup("COM047")).thenReturn(cycleCodes);

        // Mock Weekly Codes (COM074)
        List<CommonCodeDto> dfkCodes = List.of(
            new CommonCodeDto("COM074", "1", "Mon", "Monday", "Y")
        );
        when(commonCodeService.getCodesByGroup("COM074")).thenReturn(dfkCodes);

        // When
        backupOpertService.getBackupOpertList(null, null, PageRequest.of(0, 10));

        // Then
        // Expect COM047 to be called once
        verify(commonCodeService, times(1)).getCodesByGroup("COM047");

        // Expect COM074 to be called once now
        verify(commonCodeService, times(1)).getCodesByGroup("COM074");
    }
}
