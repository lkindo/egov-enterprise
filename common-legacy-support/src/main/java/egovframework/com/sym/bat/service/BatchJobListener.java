package egovframework.com.sym.bat.service;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

import org.egovframe.rte.fdl.cmmn.exception.FdlException;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.quartz.JobDataMap;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.quartz.JobListener;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * ????????, ????????Quartz JobListener ?????? ???.
 *
 * @author ?
 * @see
 * 
 *      <pre>
 * == ?????Modification Information) ==
 *
 *   ????      ????          ????
 *  -------     --------    ---------------------------
 *  2010-08-30   ?    ????
 *  2017-02-06   ????     ??????ES) - ?????? ?????? ??CWE-253, CWE-440, CWE-756]
 *      </pre>
 **/

public class BatchJobListener implements JobListener {

	/** egovBatchSchdulService **/
	private EgovBatchSchdulService egovBatchSchdulService;

	/** ID Generation **/
	private EgovIdGnrService idgenService;

	/** logger **/
	private static final Logger LOGGER = LoggerFactory.getLogger(BatchJobListener.class);

	/**
	 * ?????????? ????.
	 *
	 * @param egovBatchSchdulService the egovBatchSchdulService to set
	 **/
	public void setEgovBatchSchdulService(EgovBatchSchdulService egovBatchSchdulService) {
		this.egovBatchSchdulService = egovBatchSchdulService;
	}

	/**
	 * ?ID ??????
	 * 
	 * @param idgenService the idgenService to set
	 **/
	public void setIdgenService(EgovIdGnrService idgenService) {
		this.idgenService = idgenService;
	}

	/**
	 * Job Listener ???????.
	 * 
	 * @see org.quartz.JobListener#getName()
	 **/
	@Override
	public String getName() {
		return this.getClass().getName();
	}

	/**
	 * Batch ???????? Batch??'??????????
	 *
	 * @param jobContext JobExecutionContext
	 * @see org.quartz.JobListener#jobToBeExecuted(JobExecutionContext jobContext)
	 **/
	@Override
	public void jobToBeExecuted(JobExecutionContext jobContext) {
		LOGGER.debug("job[{}] jobToBeExecuted ", jobContext.getJobDetail().getKey().getName());
		BatchResult batchResult = new BatchResult();
		JobDataMap dataMap = jobContext.getJobDetail().getJobDataMap();
		try {
			// ????.
			batchResult.setBatchResultId(idgenService.getNextStringId());
			batchResult.setBatchSchdulId(dataMap.getString("batchSchdulId"));
			batchResult.setBatchOpertId(dataMap.getString("batchOpertId"));
			batchResult.setParamtr(dataMap.getString("paramtr"));
			batchResult.setSttus("03"); // ??????
			batchResult.setErrorInfo("Error Info");

			String executBeginTimeStr = null;
			Date executBeginTime = new Date();
			SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss", Locale.getDefault());
			executBeginTimeStr = formatter.format(executBeginTime);
			batchResult.setExecutBeginTime(executBeginTimeStr);

			batchResult.setLastUpdusrId("SYSTEM");
			batchResult.setFrstRegisterId("SYSTEM");

			egovBatchSchdulService.insertBatchResult(batchResult);

			// ????????? ??? datamap???ID???????
			dataMap.put("batchResultId", batchResult.getBatchResultId());
			// 2017.02.06 ???? ??????ES)-?????? ??CWE-253, CWE-440, CWE-754]
		} catch (FdlException e) {
			LOGGER.error(
					"[FdlException]          ????        D : {},          ??         ID : {},          ?               ????insert) ?   ?    : {}",
					batchResult.getBatchSchdulId(), batchResult.getBatchOpertId(), e.getMessage());
		} catch (Exception e) {
			LOGGER.error(
					"(Ko)          ????        D : {},          ??         ID : {},          ?               ????insert) ?   ?    : {}",
					batchResult.getBatchSchdulId(), batchResult.getBatchOpertId(), e.getMessage());
			LOGGER.error(
					"(En) [" + e.getClass() + "] BatchScheduleID : {}, BatchJobID : {}, BatchResult(insert) Error : {}",
					batchResult.getBatchSchdulId(), batchResult.getBatchOpertId(), e.getMessage());
		}

	}

	/**
	 * Batch ?????? Batch??'?'???????
	 *
	 * @param jobContext JobExecutionContext
	 * @see org.quartz.JobListener#jobWasExecuted(JobExecutionContext jobContext)
	 **/
	@Override
	public void jobWasExecuted(JobExecutionContext jobContext, JobExecutionException jee) {
		LOGGER.debug("job[{}] jobWasExecuted", jobContext.getJobDetail().getKey().getName());
		LOGGER.debug("job[{}] ??      ??       : {}, {}", jobContext.getJobDetail().getKey().getName(),
				jobContext.getFireTime(), jobContext.getJobRunTime());

		int jobResult = 99;
		BatchResult batchResult = new BatchResult();
		JobDataMap dataMap = jobContext.getJobDetail().getJobDataMap();
		try {
			// ????.
			batchResult.setBatchResultId(dataMap.getString("batchResultId"));
			batchResult.setBatchSchdulId(dataMap.getString("batchSchdulId"));
			batchResult.setBatchOpertId(dataMap.getString("batchOpertId"));
			batchResult.setParamtr(dataMap.getString("paramtr"));
			if (jobContext.getResult() != null) {
				jobResult = (Integer) jobContext.getResult();
			}
			if (jobResult == 0) {
				// ?? ?.
				batchResult.setSttus("01");
				batchResult.setErrorInfo("Error Info");
			} else {
				// ????0????????? ?? ???
				batchResult.setSttus("02");
				batchResult.setErrorInfo("Error Info");
			}
			// ???exception??????
			if (jee != null) {
				LOGGER.error("JobExecutionException             ?: {}", jee);
				batchResult.setSttus("02");
				batchResult.setErrorInfo("Error Info");
			}

			String executEndTimeStr = null;
			Date executEndTime = new Date();
			SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss", Locale.getDefault());
			executEndTimeStr = formatter.format(executEndTime);
			batchResult.setExecutEndTime(executEndTimeStr);

			batchResult.setLastUpdusrId("SYSTEM");

			egovBatchSchdulService.updateBatchResult(batchResult);

			// ????????? ??? datamap???ID???????
			dataMap.put("batchResultId", batchResult.getBatchResultId());
		} catch (ClassCastException e) {// KISA ?? ??(2018-10-29, ????
			LOGGER.error(
					"[ClassCastException]          ?               ID : {},          ????        D : {},          ??         ID : {},          ?               ????update) ?   ?    : {}",
					batchResult.getBatchResultId(), batchResult.getBatchSchdulId(),
					batchResult.getBatchOpertId(), e.getMessage());
			LOGGER.error("[ClassCastException] [" + e.getClass()
					+ "] BatchResultID : {}, BatchScheduleID : {}, BatchJobID : {}, BatchResult(update) Error : {}",
					batchResult.getBatchResultId(), batchResult.getBatchSchdulId(),
					batchResult.getBatchOpertId(), e.getMessage());
		} catch (Exception e) {
			// 2017.02.06 ???? ??????ES)-?????? ??CWE-253, CWE-440, CWE-754]
			LOGGER.error(
					"(Ko)          ?               ID : {},          ????        D : {},          ??         ID : {},          ?               ????update) ?   ?    : {}",
					batchResult.getBatchResultId(), batchResult.getBatchSchdulId(),
					batchResult.getBatchOpertId(), e.getMessage());
			LOGGER.error("(En) [" + e.getClass()
					+ "] BatchResultID : {}, BatchScheduleID : {}, BatchJobID : {}, BatchResult(update) Error : {}",
					batchResult.getBatchResultId(), batchResult.getBatchSchdulId(),
					batchResult.getBatchOpertId(), e.getMessage());
		}
	}

	/**
	 * Batch ???????? Batch??'??'???????
	 *
	 * @param jobContext JobExecutionContext
	 *
	 * @see org.quartz.JobListener#jobExecutionVetoed(JobExecutionContext
	 *      jobContext)
	 **/
	@Override
	public void jobExecutionVetoed(JobExecutionContext jobContext) {
		LOGGER.debug("job[{}] jobExecutionVetoed", jobContext.getJobDetail().getKey().getName());

		BatchResult batchResult = new BatchResult();
		JobDataMap dataMap = jobContext.getJobDetail().getJobDataMap();
		try {
			// ????.
			batchResult.setBatchResultId(dataMap.getString("batchResultId"));
			batchResult.setBatchSchdulId(dataMap.getString("batchSchdulId"));
			batchResult.setBatchOpertId(dataMap.getString("batchOpertId"));
			batchResult.setParamtr(dataMap.getString("paramtr"));
			// ?????? ????????? ??.
			batchResult.setSttus("02");
			batchResult.setErrorInfo("Error Info");

			String executEndTimeStr = null;
			Date executEndTime = new Date();
			SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss", Locale.getDefault());
			executEndTimeStr = formatter.format(executEndTime);
			batchResult.setExecutEndTime(executEndTimeStr);

			batchResult.setLastUpdusrId("SYSTEM");

			egovBatchSchdulService.updateBatchResult(batchResult);

			// ????????? ??? datamap???ID???????
			dataMap.put("batchResultId", batchResult.getBatchResultId());
		} catch (ClassCastException e) {// KISA ?? ??(2018-10-29, ????
			LOGGER.error(
					"[ClassCastException]          ?               ID : {},          ????        D : {},          ??         ID : {},          ?               ????update) ?   ?    : {}",
					batchResult.getBatchResultId(), batchResult.getBatchSchdulId(),
					batchResult.getBatchOpertId(), e.getMessage());
			LOGGER.error("[ClassCastException] [" + e.getClass()
					+ "] BatchResultID : {}, BatchScheduleID : {}, BatchJobID : {}, BatchResult(update) Error : {}",
					batchResult.getBatchResultId(), batchResult.getBatchSchdulId(),
					batchResult.getBatchOpertId(), e.getMessage());
		} catch (Exception e) {
			// 2017.02.06 ???? ??????ES)-?????? ??CWE-253, CWE-440, CWE-754]
			LOGGER.error(
					"(Ko)          ?               ID : {},          ????        D : {},          ??         ID : {},          ?               ????update) ?   ?    : {}",
					batchResult.getBatchResultId(), batchResult.getBatchSchdulId(),
					batchResult.getBatchOpertId(), e.getMessage());
			LOGGER.error("(En) [" + e.getClass()
					+ "] BachResultID : {}, BatchScheduleID : {},          ??         ID : {},          ?               ????update) ?   ?    : {}",
					batchResult.getBatchResultId(), batchResult.getBatchSchdulId(),
					batchResult.getBatchOpertId(), e.getMessage());
		}

	}

}
