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
 * Quartz Scheduler를 실행하는 스케줄러 클래스를 정의한다. (Modernized)
 */
public class BackupScheduler {

	private EgovBackupOpertService backupOpertService;

	private EgovBackupResultService backupResultService;

	private EgovIdGnrService idgenService;

	private Scheduler sched;

	private static final Logger LOGGER = LoggerFactory.getLogger(BackupScheduler.class);

	private static final int RECORD_COUNT_PER_PAGE = 10000;

	/**
	 * 백업스케줄러에 backupOpert 파라미터를 이용하여 Job , Trigger를 Add 한다.
	 *
	 * @param backupOpert 백업스케줄러에 등록할 백업작업정보
	 * @exception Exception Exception
	 */
	public void insertBackupOpert(BackupOpertDto backupOpert) throws Exception {
		LOGGER.debug("백업스케줄을 등록합니다. 백업작업ID : {}", backupOpert.getBackupOpertId());

		// Job 만들기
		JobDetail jobDetail = newJob(BackupJob.class)
				.withIdentity(backupOpert.getBackupOpertId())
				.build();

		// Trigger 만들기
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

		// 데이터 전달
		jobDetail.getJobDataMap().put("backupOpertId", backupOpert.getBackupOpertId());
		jobDetail.getJobDataMap().put("backupOrginlDrctry", backupOpert.getBackupOrginlDrctry());
		jobDetail.getJobDataMap().put("backupStreDrctry", backupOpert.getBackupStreDrctry());
		jobDetail.getJobDataMap().put("cmprsSe", backupOpert.getCmprsSe());

		try {
			sched.scheduleJob(jobDetail, trigger);
		} catch (SchedulerException e) {
			LOGGER.error("스케줄러에 백업작업추가할때 에러가 발생했습니다. 백업작업ID : {}", backupOpert.getBackupOpertId());
			LOGGER.error("에러내용 : {}", e.getMessage());
		}
	}

	/**
	 * 백업스케줄러에 backupOpert 파라미터를 이용하여 Job , Trigger를 갱신 한다.
	 *
	 * @param backupOpert 백업스케줄러에 갱신할 백업작업정보
	 * @exception Exception Exception
	 */
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

		// 데이터 전달
		jobDetail.getJobDataMap().put("backupOpertId", backupOpert.getBackupOpertId());
		jobDetail.getJobDataMap().put("backupOrginlDrctry", backupOpert.getBackupOrginlDrctry());
		jobDetail.getJobDataMap().put("backupStreDrctry", backupOpert.getBackupStreDrctry());
		jobDetail.getJobDataMap().put("cmprsSe", backupOpert.getCmprsSe());

		try {
			sched.deleteJob(JobKey.jobKey(backupOpert.getBackupOpertId()));
			sched.scheduleJob(jobDetail, trigger);
		} catch (SchedulerException e) {
			LOGGER.error("스케줄러에 백업작업갱신할때 에러가 발생했습니다. 백업작업ID : {}", backupOpert.getBackupOpertId());
			LOGGER.error("에러내용 : {}", e.getMessage());
		}
	}

	/**
	 * 백업스케줄러에 backupOpert 파라미터를 이용하여 Job , Trigger를 삭제한다.
	 *
	 * @param backupOpert 백업스케줄러에 삭제할 백업작업정보
	 * @exception Exception Exception
	 */
	public void deleteBackupOpert(BackupOpertDto backupOpert) throws Exception {
		try {
			LOGGER.debug("백업작업을 삭제합니다. 백업작업ID : {}", backupOpert.getBackupOpertId());
			sched.deleteJob(JobKey.jobKey(backupOpert.getBackupOpertId()));
		} catch (SchedulerException e) {
			LOGGER.error("스케줄러에 백업작업을 삭제할때 에러가 발생했습니다. 백업작업ID : {}", backupOpert.getBackupOpertId());
			LOGGER.error("에러내용 : {}", e.getMessage());
		}
	}

	public void init() throws Exception {
		// 모니터링 대상 정보 읽어들이기 (사용중인 것만)
		Page<BackupOpertDto> page = backupOpertService.getBackupOpertList(null, null,
				PageRequest.of(0, RECORD_COUNT_PER_PAGE));
		List<BackupOpertDto> targetList = page.getContent();

		LOGGER.debug("Result 건수 : {}", targetList.size());

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
