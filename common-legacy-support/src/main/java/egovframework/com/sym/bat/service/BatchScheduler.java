package egovframework.com.sym.bat.service;

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

/**
 * Quartz Scheduler?????? ??????????? ???.
 *
 * @author ?
 * @see
 * <pre>
 * == ?????Modification Information) ==
 *
 *   ????      ????          ????
 *  -------     --------    ---------------------------
 *  2010.08.30   ?    ????
 *  2024.10.29	LeeBaekHaeng	???@SuppressWarnings("unchecked") ???????
 * </pre>
 **/

public class BatchScheduler {

	private EgovBatchSchdulService egovBatchSchdulService;

	/** ID Generation **/
	private EgovIdGnrService idgenService;

	/** Quartz ?????**/
	private Scheduler sched;

	private static final Logger LOGGER = LoggerFactory.getLogger(BatchScheduler.class);

	// ?? ??? ??? ?? ???
	private static final int RECORD_COUNT_PER_PAGE = 10000;

	/**
	 * ???????batchSchdul ???????? Job , Trigger??Add ??.
	 *
	 * @param batchSchdul  ???????????????
	 * @exception Exception Exception
	 **/
	public void insertBatchSchdul(BatchSchdul batchSchdul) throws Exception {
		// Job ?
		JobDetail jobDetail = newJob(BatchShellScriptJob.class).withIdentity(batchSchdul.getBatchSchdulId()).build();

		// Trigger ?
		CronTrigger trigger = newTrigger().withIdentity(batchSchdul.getBatchSchdulId()).withSchedule(cronSchedule(batchSchdul.toCronExpression())).forJob(jobDetail.getKey().getName()).build();

		LOGGER.debug("         ????        ???         ??      ??          ????        D : {}", batchSchdul.getBatchSchdulId());
		LOGGER.debug("{} - cronexpression : {}", batchSchdul.getBatchSchdulId(), trigger.getCronExpression());
		BatchJobListener listener = new BatchJobListener();

		listener.setEgovBatchSchdulService(egovBatchSchdulService);
		listener.setIdgenService(idgenService);

		sched.getListenerManager().addJobListener(listener);

		// ????
		jobDetail.getJobDataMap().put("batchOpertId", batchSchdul.getBatchOpertId());
		jobDetail.getJobDataMap().put("batchSchdulId", batchSchdul.getBatchSchdulId());
		jobDetail.getJobDataMap().put("batchProgrm", batchSchdul.getBatchProgrm());
		jobDetail.getJobDataMap().put("paramtr", batchSchdul.getParamtr());

		try {
			// ??????????
			sched.scheduleJob(jobDetail, trigger);
		} catch (SchedulerException e) {
			// SchedulerException ???? ????????? ???? ????
			// ?????????? ???????????SchedulerException????.
			LOGGER.error("???        ???         ??         ?      ??          ?   ?                        ??      ??      .          ????        D : {},          ??         ID : {}", batchSchdul.getBatchSchdulId(), batchSchdul.getBatchOpertId());
			LOGGER.error("?   ?   ??       : {}", e.getMessage());
			//LOGGER.debug(e.getMessage(), e);
		}
	}

	/**
	 * ???????batchSchdul ???????? Job , Trigger??????.
	 *
	 * @param batchSchdul  ???????????????
	 * @exception Exception Exception
	 **/
	public void updateBatchSchdul(BatchSchdul batchSchdul) throws Exception {
		// Job ?
		JobDetail jobDetail = newJob(BatchShellScriptJob.class).withIdentity(batchSchdul.getBatchSchdulId()).build();
		// Trigger ?
		CronTrigger trigger = newTrigger().withIdentity(batchSchdul.getBatchSchdulId()).withSchedule(cronSchedule(batchSchdul.toCronExpression())).forJob(jobDetail.getKey().getName()).build();

		LOGGER.debug("         ????        ??         ???      ??          ????        D : {}", batchSchdul.getBatchSchdulId());
		LOGGER.debug("{} - cronexpression : {}", batchSchdul.getBatchSchdulId(), trigger.getCronExpression());

		BatchJobListener listener = new BatchJobListener();

		listener.setEgovBatchSchdulService(egovBatchSchdulService);
		listener.setIdgenService(idgenService);

		sched.getListenerManager().addJobListener(listener);

		// ????
		jobDetail.getJobDataMap().put("batchOpertId", batchSchdul.getBatchOpertId());
		jobDetail.getJobDataMap().put("batchSchdulId", batchSchdul.getBatchSchdulId());
		jobDetail.getJobDataMap().put("batchProgrm", batchSchdul.getBatchProgrm());
		jobDetail.getJobDataMap().put("paramtr", batchSchdul.getParamtr());

		try {
			// ?????? ?ob, Trigger ?????
			sched.deleteJob(JobKey.jobKey(batchSchdul.getBatchSchdulId()));
			// ??????????
			sched.scheduleJob(jobDetail, trigger);
		} catch (SchedulerException e) {
			// SchedulerException ???? ????????? ???? ????
			// ?????????? ???????????SchedulerException????.
			LOGGER.error("???        ???         ??                  ??          ?   ?                        ??      ??      .          ????        D : {},          ??         ID : {}", batchSchdul.getBatchSchdulId(), batchSchdul.getBatchOpertId());
			LOGGER.error("?   ?   ??       : {}", e.getMessage());
			//LOGGER.debug(e.getMessage(), e);
		}
	}

	/**
	 * ???????batchSchdul ???????? Job , Trigger???????.
	 *
	 * @param batchSchdul  ?????????????????
	 * @exception Exception Exception
	 **/
	public void deleteBatchSchdul(BatchSchdul batchSchdul) throws Exception {

		try {
			// ?????? ?ob, Trigger ?????
			LOGGER.debug("         ????        ???????      ??          ????        D : {}", batchSchdul.getBatchSchdulId());
			sched.deleteJob(JobKey.jobKey(batchSchdul.getBatchSchdulId()));
		} catch (SchedulerException e) {
			// SchedulerException ???? ????????? ???? ????
			// ?????????? ???????????SchedulerException????.
			LOGGER.error("???        ???         ??         ??????          ?   ?                        ??      ??      .          ????        D : {},          ??         ID : ", batchSchdul.getBatchSchdulId(), batchSchdul.getBatchOpertId());
			LOGGER.error("?   ?   ??       : {}", e.getMessage());
			//LOGGER.debug(e.getMessage(), e);
		}
	}

	/**
	 * ??????????.
	 * ??????????????Quartz ??????????
	 *
	 **/
	public void init() throws Exception {
		// ?? ????? ?????~~
		List<BatchSchdul> targetList = null;
		BatchSchdul searchVO = new BatchSchdul();
		// ?? ??????????
		searchVO.setPageIndex(1);
		searchVO.setFirstIndex(0);
		searchVO.setRecordCountPerPage(RECORD_COUNT_PER_PAGE);
		targetList = egovBatchSchdulService.selectBatchSchdulList(searchVO);
		LOGGER.debug("         ?   ?          {}", searchVO);
		LOGGER.debug("Result          ??: {}", targetList.size());

		// ?????????
		SchedulerFactory schedFact = new org.quartz.impl.StdSchedulerFactory();
		sched = schedFact.getScheduler();

		// Set up the listener
		BatchJobListener listener = new BatchJobListener();

		listener.setEgovBatchSchdulService(egovBatchSchdulService);
		listener.setIdgenService(idgenService);

		//sched.addGlobalJobListener(listener);
		sched.getListenerManager().addJobListener(listener);

		// ??????Job, Trigger ???
		BatchSchdul target = null;
		for (BatchSchdul element : targetList) {
			target = element;
			LOGGER.debug("Data : {}", target);

			insertBatchSchdul(target);
		}

		sched.start();
	}

	/**
	 * ?????destroy???
	 * Quartz ??????shutdown??.
	 *
	 **/
	public void destroy() throws Exception {
		sched.shutdown();
	}

	/**
	 * ??????????
	 * @return the egovBatchSchdulService
	 **/
	public EgovBatchSchdulService getEgovBatchSchdulService() {
		return egovBatchSchdulService;
	}

	/**
	 * ?????????????
	 * @param egovBatchSchdulService the egovBatchSchdulService to set
	 **/
	public void setEgovBatchSchdulService(EgovBatchSchdulService egovBatchSchdulService) {
		this.egovBatchSchdulService = egovBatchSchdulService;
	}

	/**
	 * ?ID ???????
	 * @return the idgenService
	 **/
	public EgovIdGnrService getIdgenService() {
		return idgenService;
	}

	/**
	 * ?ID ??????????
	 * @param idgenService the idgenService to set
	 **/
	public void setIdgenService(EgovIdGnrService idgenService) {
		this.idgenService = idgenService;
	}
}
