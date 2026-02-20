package egovframework.com.sym.sym.bak.service;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.quartz.JobDataMap;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.quartz.JobListener;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.company.project.service.backup.EgovBackupResultService;
import com.company.project.service.backup.dto.BackupResultDto;

/**
 * ???????, ????????Quartz JobListener ?????? ???. (Modernized)
 **/
public class BackupJobListener implements JobListener {

	private EgovBackupResultService backupResultService;

	private EgovIdGnrService idgenService;

	private static final Logger LOGGER = LoggerFactory.getLogger(BackupJobListener.class);

	public void setBackupResultService(EgovBackupResultService backupResultService) {
		this.backupResultService = backupResultService;
	}

	public void setIdgenService(EgovIdGnrService idgenService) {
		this.idgenService = idgenService;
	}

	@Override
	public String getName() {
		return this.getClass().getName();
	}

	@Override
	public void jobToBeExecuted(JobExecutionContext jobContext) {
		LOGGER.debug("job[{}] jobToBeExecuted", jobContext.getJobDetail().getKey().getName());
		JobDataMap dataMap = jobContext.getJobDetail().getJobDataMap();
		try {
			String resultId = idgenService.getNextStringId();
			BackupResultDto dto = BackupResultDto.builder()
					.backupResultId(resultId)
					.backupOpertId(dataMap.getString("backupOpertId"))
					.backupFile(dataMap.getString("backupFile"))
					.sttus("03") // ???
					.errorInfo("")
					.executBeginTime(new SimpleDateFormat("yyyyMMddHHmmss", Locale.getDefault()).format(new Date()))
					.build();

			backupResultService.createBackupResult("SYSTEM", dto);
			dataMap.put("backupResultId", resultId);
		} catch (Exception e) {
			LOGGER.error("Backup Result(insert) Error : {}", e.getMessage());
		}
	}

	@Override
	public void jobWasExecuted(JobExecutionContext jobContext, JobExecutionException jee) {
		LOGGER.debug("job[{}] jobWasExecuted", jobContext.getJobDetail().getKey().getName());
		JobDataMap dataMap = jobContext.getJobDetail().getJobDataMap();
		try {
			boolean jobResult = false;
			if (jobContext.getResult() != null) {
				jobResult = (Boolean) jobContext.getResult();
			}

			BackupResultDto dto = new BackupResultDto();
			dto.setSttus(jobResult ? "01" : "02");
            dto.setErrorInfo(jobResult ? "" : "Error");

			if (jee != null) {
				dto.setSttus("02");
				dto.setErrorInfo(dto.getErrorInfo() + "\nJobExecutionException: " + jee.getMessage());
			}

			dto.setExecutEndTime(new SimpleDateFormat("yyyyMMddHHmmss", Locale.getDefault()).format(new Date()));

			backupResultService.updateBackupResult(dataMap.getString("backupResultId"), "SYSTEM", dto);
		} catch (Exception e) {
			LOGGER.error("Backup Result(update) Error : {}", e.getMessage());
		}
	}

	@Override
	public void jobExecutionVetoed(JobExecutionContext jobContext) {
		LOGGER.debug("job[{}] jobExecutionVetoed", jobContext.getJobDetail().getKey().getName());
		JobDataMap dataMap = jobContext.getJobDetail().getJobDataMap();
		try {
			BackupResultDto dto = new BackupResultDto();
			dto.setSttus("02");
			dto.setErrorInfo("???        ??   ?          ??         ????      ??? ??      ??     ??jobExecutionVetoed).");
			dto.setExecutEndTime(new SimpleDateFormat("yyyyMMddHHmmss", Locale.getDefault()).format(new Date()));

			backupResultService.updateBackupResult(dataMap.getString("backupResultId"), "SYSTEM", dto);
		} catch (Exception e) {
			LOGGER.error("Backup Result(vetoed-update) Error : {}", e.getMessage());
		}
	}
}
