package egovframework.com.sym.sym.bak.service;

import static org.quartz.CronScheduleBuilder.cronSchedule;
import static org.quartz.JobBuilder.newJob;
import static org.quartz.TriggerBuilder.newTrigger;

import java.util.List;

import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.quartz.CronTrigger;
import org.quartz.JobDetail;
import org.quartz.JobKey;
import org.quartz.Scheduler;
import org.quartz.SchedulerException;
import org.quartz.SchedulerFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import com.company.project.service.backup.EgovBackupOpertService;
import com.company.project.service.backup.EgovBackupResultService;
import com.company.project.service.backup.dto.BackupOpertDto;

/**
 * Quartz Scheduler?????? ??????????? ???. (Modernized)
 **/
public class BackupScheduler {

	private EgovBackupOpertService backupOpertService;

	private EgovBackupResultService backupResultService;

	private EgovIdGnrService idgenService;

	private Scheduler sched;

	private static final Logger LOGGER = LoggerFactory.getLogger(BackupScheduler.class);

	private static final int RECORD_COUNT_PER_PAGE = 10000;

	/**
	 * ??????backupOpert ???????? Job , Trigger??Add ??.
	 *
	 * @param backupOpert ???????????
	 * @exception Exception Exception
	 **/
	public void insertBackupOpert(BackupOpertDto backupOpert) throws Exception {
		LOGGER.debug("            ???        ???         ??      ??             ?         ID : {}", backupOpert.getBackupOpertId());

		// Job ?
		JobDetail jobDetail = newJob(BackupJob.class)
				.withIdentity(backupOpert.getBackupOpertId())
				.build();

		// Trigger ?
		CronTrigger trigger = newTrigger()
				.withIdentity(backupOpert.getBackupOpertId())
				.withSchedule(cronSchedule(backupOpert.toCronExpression()))
				.forJob(jobDetail.getKey().getName())
				.build();

		LOGGER.debug("{} - cronexpression : {}", backupOpert.getBackupOpertId(), trigger.getCronExpression());

		BackupJobListener listener = new BackupJobListener();
		listener.setBackupResultService(backupResultService);
		listener.setIdgenService(idgenService);

		sched.getListenerManager().addJobListener(listener);

		// ????
		jobDetail.getJobDataMap().put("backupOpertId", backupOpert.getBackupOpertId());
		jobDetail.getJobDataMap().put("backupOrginlDrctry", backupOpert.getBackupOrginlDrctry());
		jobDetail.getJobDataMap().put("backupStreDrctry", backupOpert.getBackupStreDrctry());
		jobDetail.getJobDataMap().put("cmprsSe", backupOpert.getCmprsSe());

		try {
			sched.scheduleJob(jobDetail, trigger);
		} catch (SchedulerException e) {
			LOGGER.error("???        ???            ?         ?      ??          ?   ?                        ??      ??      .             ?         ID : {}", backupOpert.getBackupOpertId());
			LOGGER.error("?   ?   ??       : {}", e.getMessage());
		}
	}

	/**
	 * ??????backupOpert ???????? Job , Trigger??????.
	 *
	 * @param backupOpert ???????????
	 * @exception Exception Exception
	 **/
	public void updateBackupOpert(BackupOpertDto backupOpert) throws Exception {
		JobDetail jobDetail = newJob(BackupJob.class)
				.withIdentity(backupOpert.getBackupOpertId())
				.build();

		CronTrigger trigger = newTrigger()
				.withIdentity(backupOpert.getBackupOpertId())
				.withSchedule(cronSchedule(backupOpert.toCronExpression()))
				.forJob(jobDetail.getKey().getName())
				.build();

		LOGGER.debug("{} - cronexpression : {}", backupOpert.getBackupOpertId(), trigger.getCronExpression());

		BackupJobListener listener = new BackupJobListener();
		listener.setBackupResultService(backupResultService);
		listener.setIdgenService(idgenService);

		sched.getListenerManager().addJobListener(listener);

		// ????
		jobDetail.getJobDataMap().put("backupOpertId", backupOpert.getBackupOpertId());
		jobDetail.getJobDataMap().put("backupOrginlDrctry", backupOpert.getBackupOrginlDrctry());
		jobDetail.getJobDataMap().put("backupStreDrctry", backupOpert.getBackupStreDrctry());
		jobDetail.getJobDataMap().put("cmprsSe", backupOpert.getCmprsSe());

		try {
			sched.deleteJob(JobKey.jobKey(backupOpert.getBackupOpertId()));
			sched.scheduleJob(jobDetail, trigger);
		} catch (SchedulerException e) {
			LOGGER.error("???        ???            ?                  ??          ?   ?                        ??      ??      .             ?         ID : {}", backupOpert.getBackupOpertId());
			LOGGER.error("?   ?   ??       : {}", e.getMessage());
		}
	}

	/**
	 * ??????backupOpert ???????? Job , Trigger???????.
	 *
	 * @param backupOpert ?????????????
	 * @exception Exception Exception
	 **/
	public void deleteBackupOpert(BackupOpertDto backupOpert) throws Exception {
		try {
			LOGGER.debug("            ?         ???????      ??             ?         ID : {}", backupOpert.getBackupOpertId());
			sched.deleteJob(JobKey.jobKey(backupOpert.getBackupOpertId()));
		} catch (SchedulerException e) {
			LOGGER.error("???        ???            ?         ??????          ?   ?                        ??      ??      .             ?         ID : {}", backupOpert.getBackupOpertId());
			LOGGER.error("?   ?   ??       : {}", e.getMessage());
		}
	}

	public void init() throws Exception {
		// ?? ????? ?????(??? ?
		Page<BackupOpertDto> page = backupOpertService.getBackupOpertList(null, null,
				PageRequest.of(0, RECORD_COUNT_PER_PAGE));
		List<BackupOpertDto> targetList = page.getContent();

		LOGGER.debug("Result          ??: {}", targetList.size());

		SchedulerFactory schedFact = new org.quartz.impl.StdSchedulerFactory();
		sched = schedFact.getScheduler();

		BackupJobListener listener = new BackupJobListener();
		listener.setBackupResultService(backupResultService);
		listener.setIdgenService(idgenService);

		sched.getListenerManager().addJobListener(listener);

		for (BackupOpertDto target : targetList) {
			insertBackupOpert(target);
		}
		sched.start();
	}

	public void destroy() throws Exception {
		if (sched != null) {
			sched.shutdown();
		}
	}

	public EgovBackupOpertService getBackupOpertService() {
		return backupOpertService;
	}

	public void setBackupOpertService(EgovBackupOpertService backupOpertService) {
		this.backupOpertService = backupOpertService;
	}

	public EgovBackupResultService getBackupResultService() {
		return backupResultService;
	}

	public void setBackupResultService(EgovBackupResultService backupResultService) {
		this.backupResultService = backupResultService;
	}

	public EgovIdGnrService getIdgenService() {
		return idgenService;
	}

	public void setIdgenService(EgovIdGnrService idgenService) {
		this.idgenService = idgenService;
	}
}
