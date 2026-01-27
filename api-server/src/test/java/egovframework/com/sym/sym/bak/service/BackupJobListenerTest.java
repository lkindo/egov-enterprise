package egovframework.com.sym.sym.bak.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.quartz.JobDataMap;
import org.quartz.JobDetail;
import org.quartz.JobExecutionContext;
import org.quartz.JobKey;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;

@ExtendWith({MockitoExtension.class, OutputCaptureExtension.class})
class BackupJobListenerTest {

    @Mock
    private EgovBackupOpertService egovBackupOpertService;

    @Mock
    private EgovIdGnrService idgenService;

    @Mock
    private JobExecutionContext jobContext;

    @Mock
    private JobDetail jobDetail;

    @Mock
    private JobKey jobKey;

    @InjectMocks
    private BackupJobListener backupJobListener;

    @Test
    void jobToBeExecuted_WithNullBackupOpertId_ShouldLogErrorAndNotInsert(CapturedOutput output) throws Exception {
        // Arrange
        when(jobContext.getJobDetail()).thenReturn(jobDetail);
        when(jobDetail.getJobDataMap()).thenReturn(new JobDataMap());
        when(jobDetail.getKey()).thenReturn(jobKey);
        when(jobKey.getName()).thenReturn("testJob");

        when(idgenService.getNextStringId()).thenReturn("RESULT_001");

        // Act
        backupJobListener.jobToBeExecuted(jobContext);

        // Assert
        verify(egovBackupOpertService, never()).insertBackupResult(any(BackupResult.class));
        // We expect an ERROR log with a specific message after the fix.
        // The message "Backup Result's Backup Operation ID is null" is close to the current message too.
        assertTrue(output.getOut().contains("Backup Result's Backup Operation ID is null"), "Should log that ID is null/empty");
    }

    @Test
    void jobToBeExecuted_WithValidBackupOpertId_ShouldInsert(CapturedOutput output) throws Exception {
        // Arrange
        JobDataMap dataMap = new JobDataMap();
        dataMap.put("backupOpertId", "OPERT_001");
        dataMap.put("backupFile", "backup.zip");

        when(jobContext.getJobDetail()).thenReturn(jobDetail);
        when(jobDetail.getJobDataMap()).thenReturn(dataMap);
        when(jobDetail.getKey()).thenReturn(jobKey);
        when(jobKey.getName()).thenReturn("testJob");

        when(idgenService.getNextStringId()).thenReturn("RESULT_001");

        // Act
        backupJobListener.jobToBeExecuted(jobContext);

        // Assert
        verify(egovBackupOpertService).insertBackupResult(any(BackupResult.class));
    }
}
