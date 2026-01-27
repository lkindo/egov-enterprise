package egovframework.com.sym.sym.bak.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.junit.jupiter.api.DisplayName;
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

@ExtendWith(MockitoExtension.class)
@ExtendWith(OutputCaptureExtension.class)
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
    @DisplayName("jobToBeExecuted: Should not insert result when backupOpertId is null")
    void jobToBeExecuted_shouldNotInsert_whenBackupOpertIdIsNull(CapturedOutput output) throws Exception {
        // Arrange
        when(jobContext.getJobDetail()).thenReturn(jobDetail);
        when(jobDetail.getKey()).thenReturn(jobKey);
        when(jobKey.getName()).thenReturn("testJob");

        JobDataMap jobDataMap = new JobDataMap();
        // backupOpertId is not set
        when(jobDetail.getJobDataMap()).thenReturn(jobDataMap);

        when(idgenService.getNextStringId()).thenReturn("RESULT_001");

        // Act
        backupJobListener.jobToBeExecuted(jobContext);

        // Assert
        verify(egovBackupOpertService, never()).insertBackupResult(any(BackupResult.class));
        assertThat(output).contains("Backup Result's Backup Operation ID is null or empty. Backup Job execution cannot be tracked.");
    }

    @Test
    @DisplayName("jobToBeExecuted: Should not insert result when backupOpertId is empty")
    void jobToBeExecuted_shouldNotInsert_whenBackupOpertIdIsEmpty(CapturedOutput output) throws Exception {
        // Arrange
        when(jobContext.getJobDetail()).thenReturn(jobDetail);
        when(jobDetail.getKey()).thenReturn(jobKey);
        when(jobKey.getName()).thenReturn("testJob");

        JobDataMap jobDataMap = new JobDataMap();
        jobDataMap.put("backupOpertId", "   "); // Empty or whitespace
        when(jobDetail.getJobDataMap()).thenReturn(jobDataMap);

        when(idgenService.getNextStringId()).thenReturn("RESULT_002");

        // Act
        backupJobListener.jobToBeExecuted(jobContext);

        // Assert
        verify(egovBackupOpertService, never()).insertBackupResult(any(BackupResult.class));
        assertThat(output).contains("Backup Result's Backup Operation ID is null or empty. Backup Job execution cannot be tracked.");
    }

    @Test
    @DisplayName("jobToBeExecuted: Should insert result when backupOpertId is valid")
    void jobToBeExecuted_shouldInsert_whenBackupOpertIdIsValid(CapturedOutput output) throws Exception {
        // Arrange
        when(jobContext.getJobDetail()).thenReturn(jobDetail);
        when(jobDetail.getKey()).thenReturn(jobKey);
        when(jobKey.getName()).thenReturn("testJob");

        JobDataMap jobDataMap = new JobDataMap();
        jobDataMap.put("backupOpertId", "BACKUP_001");
        jobDataMap.put("backupFile", "/tmp/backup.zip");
        when(jobDetail.getJobDataMap()).thenReturn(jobDataMap);

        when(idgenService.getNextStringId()).thenReturn("RESULT_003");

        // Act
        backupJobListener.jobToBeExecuted(jobContext);

        // Assert
        verify(egovBackupOpertService).insertBackupResult(any(BackupResult.class));
        assertThat(output).doesNotContain("Backup Result's Backup Operation ID is null or empty");
    }
}
