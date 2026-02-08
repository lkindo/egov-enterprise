package egovframework.com.sym.sym.bak.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.junit.Before;
import org.junit.Test;
import org.quartz.JobDataMap;
import org.quartz.JobDetail;
import org.quartz.JobExecutionContext;
import org.quartz.JobKey;

public class BackupJobListenerTest {

    private BackupJobListener backupJobListener;
    private EgovBackupOpertService egovBackupOpertService;
    private EgovIdGnrService idgenService;
    private JobExecutionContext jobContext;
    private JobDetail jobDetail;
    private JobDataMap jobDataMap;
    private JobKey jobKey;

    @Before
    public void setUp() {
        backupJobListener = new BackupJobListener();
        egovBackupOpertService = mock(EgovBackupOpertService.class);
        idgenService = mock(EgovIdGnrService.class);
        jobContext = mock(JobExecutionContext.class);
        jobDetail = mock(JobDetail.class);
        jobDataMap = new JobDataMap();
        jobKey = new JobKey("testJob", "testGroup");

        backupJobListener.setEgovBackupOpertService(egovBackupOpertService);
        backupJobListener.setIdgenService(idgenService);

        when(jobContext.getJobDetail()).thenReturn(jobDetail);
        when(jobDetail.getJobDataMap()).thenReturn(jobDataMap);
        when(jobDetail.getKey()).thenReturn(jobKey);
    }

    @Test
    public void jobToBeExecuted_shouldNotInsert_whenBackupOpertIdIsNull() throws Exception {
        // Given
        jobDataMap.put("backupOpertId", null);
        jobDataMap.put("backupFile", "testFile.zip");

        // When
        backupJobListener.jobToBeExecuted(jobContext);

        // Then
        verify(egovBackupOpertService, never()).insertBackupResult(any(BackupResult.class));
    }

    @Test
    public void jobToBeExecuted_shouldNotInsert_whenBackupOpertIdIsEmpty() throws Exception {
        // Given
        jobDataMap.put("backupOpertId", "");
        jobDataMap.put("backupFile", "testFile.zip");

        // When
        backupJobListener.jobToBeExecuted(jobContext);

        // Then
        verify(egovBackupOpertService, never()).insertBackupResult(any(BackupResult.class));
    }

    @Test
    public void jobToBeExecuted_shouldNotInsert_whenBackupOpertIdIsWhitespace() throws Exception {
        // Given
        jobDataMap.put("backupOpertId", "   ");
        jobDataMap.put("backupFile", "testFile.zip");

        // When
        backupJobListener.jobToBeExecuted(jobContext);

        // Then
        verify(egovBackupOpertService, never()).insertBackupResult(any(BackupResult.class));
    }

    @Test
    public void jobToBeExecuted_shouldInsert_whenBackupOpertIdIsValid() throws Exception {
        // Given
        jobDataMap.put("backupOpertId", "validId");
        jobDataMap.put("backupFile", "testFile.zip");

        // When
        backupJobListener.jobToBeExecuted(jobContext);

        // Then
        verify(egovBackupOpertService).insertBackupResult(any(BackupResult.class));
    }
}
