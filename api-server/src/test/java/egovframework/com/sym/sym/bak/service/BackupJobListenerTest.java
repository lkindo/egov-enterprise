package egovframework.com.sym.sym.bak.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.quartz.JobDataMap;
import org.quartz.JobDetail;
import org.quartz.JobExecutionContext;
import org.quartz.JobKey;
import org.springframework.boot.test.system.OutputCaptureExtension;

@ExtendWith({MockitoExtension.class, OutputCaptureExtension.class})
class BackupJobListenerTest {

    @InjectMocks
    private BackupJobListener backupJobListener;

    @Mock
    private EgovBackupOpertService egovBackupOpertService;

    @Mock
    private EgovIdGnrService idgenService;

    @Mock
    private JobExecutionContext jobContext;

    @Mock
    private JobDetail jobDetail;

    @Mock
    private JobDataMap jobDataMap;

    @Mock
    private JobKey jobKey;

    @BeforeEach
    void setUp() throws Exception {
        when(jobContext.getJobDetail()).thenReturn(jobDetail);
        when(jobDetail.getJobDataMap()).thenReturn(jobDataMap);
        when(jobDetail.getKey()).thenReturn(jobKey);
        when(jobKey.getName()).thenReturn("testJob");
    }

    @Test
    void jobToBeExecuted_withValidId_shouldInsertResult() throws Exception {
        // Arrange
        when(idgenService.getNextStringId()).thenReturn("RESULT_001");
        when(jobDataMap.getString("backupOpertId")).thenReturn("OPERT_001");
        when(jobDataMap.getString("backupFile")).thenReturn("test.bak");

        // Act
        backupJobListener.jobToBeExecuted(jobContext);

        // Assert
        verify(egovBackupOpertService).insertBackupResult(any(BackupResult.class));
        verify(jobDataMap).put("backupResultId", "RESULT_001");
    }

    @Test
    void jobToBeExecuted_withNullId_shouldLogErrorAndNotInsert() throws Exception {
        // Arrange
        when(idgenService.getNextStringId()).thenReturn("RESULT_002");
        when(jobDataMap.getString("backupOpertId")).thenReturn(null);

        // Act
        backupJobListener.jobToBeExecuted(jobContext);

        // Assert
        verify(egovBackupOpertService, never()).insertBackupResult(any(BackupResult.class));
    }

    @Test
    void jobToBeExecuted_withEmptyId_shouldLogErrorAndNotInsert() throws Exception {
        // Arrange
        when(idgenService.getNextStringId()).thenReturn("RESULT_003");
        when(jobDataMap.getString("backupOpertId")).thenReturn("");

        // Act
        backupJobListener.jobToBeExecuted(jobContext);

        // Assert
        verify(egovBackupOpertService, never()).insertBackupResult(any(BackupResult.class));
    }

    @Test
    void jobToBeExecuted_withWhitespaceId_shouldNotInsertResult() throws Exception {
        // Arrange
        when(idgenService.getNextStringId()).thenReturn("RESULT_004");
        when(jobDataMap.getString("backupOpertId")).thenReturn("   ");

        // Act
        backupJobListener.jobToBeExecuted(jobContext);

        // Assert
        verify(egovBackupOpertService, never()).insertBackupResult(any(BackupResult.class));
    }
}
