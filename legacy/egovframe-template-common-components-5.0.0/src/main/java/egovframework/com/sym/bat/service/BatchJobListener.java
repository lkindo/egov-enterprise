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
 * 諛곗튂?묒뾽???ㅽ뻾?쒖옉, ?꾨즺瑜???ν븯??Quartz JobListener ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * @author 源吏꾨쭔
 * @see
 * <pre>
 * == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??      ?섏젙??          ?섏젙?댁슜
 *  -------     --------    ---------------------------
 *  2010-08-30   源吏꾨쭔     理쒖큹 ?앹꽦
 *  2017-02-06   ?댁젙?     ?쒗걧?댁퐫??ES) - ?쒗걧?댁퐫?? 遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-756]
 * </pre>
 */

public class BatchJobListener implements JobListener {

	/** egovBatchSchdulService */
	private EgovBatchSchdulService egovBatchSchdulService;

	/** ID Generation */
	private EgovIdGnrService idgenService;

	/** logger */
	private static final Logger LOGGER = LoggerFactory.getLogger(BatchJobListener.class);

	/**
	 * 諛곗튂?ㅼ?以??쒕퉬?ㅻ? ?ㅼ젙?쒕떎.
	 *
	 * @param egovBatchSchdulService the egovBatchSchdulService to set
	 */
	public void setEgovBatchSchdulService(EgovBatchSchdulService egovBatchSchdulService) {
		this.egovBatchSchdulService = egovBatchSchdulService;
	}

	/**
	 * 諛곗튂寃곌낵ID ?앹꽦?쒕퉬??
	 * @param idgenService the idgenService to set
	 */
	public void setIdgenService(EgovIdGnrService idgenService) {
		this.idgenService = idgenService;
	}

	/**
	 * Job Listener ?대쫫??由ы꽩?쒕떎.
	 * @see org.quartz.JobListener#getName()
	 */
	@Override
	public String getName() {
		return this.getClass().getName();
	}

	/**
	 * Batch ?묒뾽???ㅽ뻾?섍린?꾩뿉 Batch寃곌낵 '?섑뻾以??곹깭濡???ν븳??
	 *
	 * @param jobContext JobExecutionContext
	 * @see org.quartz.JobListener#jobToBeExecuted(JobExecutionContext jobContext)
	 */
	@Override
	public void jobToBeExecuted(JobExecutionContext jobContext) {
		LOGGER.debug("job[{}] jobToBeExecuted ", jobContext.getJobDetail().getKey().getName());
		BatchResult batchResult = new BatchResult();
		JobDataMap dataMap = jobContext.getJobDetail().getJobDataMap();
		try {
			// 寃곌낵 媛??명똿.
			batchResult.setBatchResultId(idgenService.getNextStringId());
			batchResult.setBatchSchdulId(dataMap.getString("batchSchdulId"));
			batchResult.setBatchOpertId(dataMap.getString("batchOpertId"));
			batchResult.setParamtr(dataMap.getString("paramtr"));
			batchResult.setSttus("03"); // ?곹깭???섑뻾以?
			batchResult.setErrorInfo("");

			String executBeginTimeStr = null;
			Date executBeginTime = new Date();
			SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss", Locale.getDefault());
			executBeginTimeStr = formatter.format(executBeginTime);
			batchResult.setExecutBeginTime(executBeginTimeStr);

			batchResult.setLastUpdusrId("SYSTEM");
			batchResult.setFrstRegisterId("SYSTEM");

			egovBatchSchdulService.insertBatchResult(batchResult);

			// ??μ씠 ?댁긽?놁씠 ?꾨즺?섎㈃  datamap??諛곗튂寃곌낵ID瑜???ν븳??
			dataMap.put("batchResultId", batchResult.getBatchResultId());
		//2017.02.06 	?댁젙? 	?쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
		} catch (FdlException e) {
			LOGGER.error("[FdlException] 諛곗튂?ㅼ?以껱D : {}, 諛곗튂?묒뾽ID : {}, 諛곗튂寃곌낵???insert) ?먮윭 : {}", batchResult.getBatchSchdulId(), batchResult.getBatchOpertId(), e.getMessage());
		} catch (Exception e) {
			LOGGER.error("(Ko) 諛곗튂?ㅼ?以껱D : {}, 諛곗튂?묒뾽ID : {}, 諛곗튂寃곌낵???insert) ?먮윭 : {}", batchResult.getBatchSchdulId(), batchResult.getBatchOpertId(), e.getMessage());
			LOGGER.error("(En) [" + e.getClass() + "] BatchScheduleID : {}, BatchJobID : {}, BatchResult(insert) Error : {}", batchResult.getBatchSchdulId(), batchResult.getBatchOpertId(), e.getMessage());
		}

	}

	/**
	 * Batch ?묒뾽???꾨즺?쒗썑 Batch寃곌낵 '?꾨즺'?곹깭濡???ν븳??
	 *
	 * @param jobContext JobExecutionContext
	 * @see org.quartz.JobListener#jobWasExecuted(JobExecutionContext jobContext)
	 */
	@Override
	public void jobWasExecuted(JobExecutionContext jobContext, JobExecutionException jee) {
		LOGGER.debug("job[{}] jobWasExecuted", jobContext.getJobDetail().getKey().getName());
		LOGGER.debug("job[{}] ?섑뻾?쒓컙 : {}, {}", jobContext.getJobDetail().getKey().getName(), jobContext.getFireTime(), jobContext.getJobRunTime());

		int jobResult = 99;
		BatchResult batchResult = new BatchResult();
		JobDataMap dataMap = jobContext.getJobDetail().getJobDataMap();
		try {
			// 寃곌낵 媛??명똿.
			batchResult.setBatchResultId(dataMap.getString("batchResultId"));
			batchResult.setBatchSchdulId(dataMap.getString("batchSchdulId"));
			batchResult.setBatchOpertId(dataMap.getString("batchOpertId"));
			batchResult.setParamtr(dataMap.getString("paramtr"));
			if (jobContext.getResult() != null) {
				jobResult = (Integer) jobContext.getResult();
			}
			if (jobResult == 0) {
				// 諛곗튂?묒뾽 ?깃났.
				batchResult.setSttus("01");
				batchResult.setErrorInfo("");
			} else {
				// 諛곗튂?묒뾽??0???꾨땶媛믪쓣 由ы꽩?섎㈃ ?먮윭 ?곹솴??
				batchResult.setSttus("02");
				batchResult.setErrorInfo("諛곗튂?묒뾽??寃곌낵媛?[" + jobResult + "]瑜?由ы꽩?덉뒿?덈떎. \n" + "諛곗튂?꾨줈洹몃옩 [" + dataMap.getString("batchProgrm") + "]??濡쒓렇瑜??뺤씤?섏꽭??);
			}
			// ?섑뻾以?exception??諛쒖깮??寃쎌슦
			if (jee != null) {
				LOGGER.error("JobExecutionException 諛쒖깮 : {}", jee);
				batchResult.setSttus("02");
				String errorInfo = batchResult.getErrorInfo();
				batchResult.setErrorInfo(errorInfo + "\n" + "JobExecutionException 諛쒖깮 : " + jee);
			}

			String executEndTimeStr = null;
			Date executEndTime = new Date();
			SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss", Locale.getDefault());
			executEndTimeStr = formatter.format(executEndTime);
			batchResult.setExecutEndTime(executEndTimeStr);

			batchResult.setLastUpdusrId("SYSTEM");

			egovBatchSchdulService.updateBatchResult(batchResult);

			// ??μ씠 ?댁긽?놁씠 ?꾨즺?섎㈃  datamap??諛곗튂寃곌낵ID瑜???ν븳??
			dataMap.put("batchResultId", batchResult.getBatchResultId());
		} catch (ClassCastException e) {//KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
			LOGGER.error("[ClassCastException] 諛곗튂寃곌낵ID : {}, 諛곗튂?ㅼ?以껱D : {}, 諛곗튂?묒뾽ID : {}, 諛곗튂寃곌낵???update) ?먮윭 : {}", batchResult.getBatchResultId(), batchResult.getBatchSchdulId(),
					batchResult.getBatchOpertId(), e.getMessage());
			LOGGER.error("[ClassCastException] ["+ e.getClass() + "] BatchResultID : {}, BatchScheduleID : {}, BatchJobID : {}, BatchResult(update) Error : {}", batchResult.getBatchResultId(), batchResult.getBatchSchdulId(),
					batchResult.getBatchOpertId(), e.getMessage());
		} catch (Exception e) {
			//2017.02.06 	?댁젙? 	?쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
			LOGGER.error("(Ko) 諛곗튂寃곌낵ID : {}, 諛곗튂?ㅼ?以껱D : {}, 諛곗튂?묒뾽ID : {}, 諛곗튂寃곌낵???update) ?먮윭 : {}", batchResult.getBatchResultId(), batchResult.getBatchSchdulId(),
					batchResult.getBatchOpertId(), e.getMessage());
			LOGGER.error("(En) ["+ e.getClass() + "] BatchResultID : {}, BatchScheduleID : {}, BatchJobID : {}, BatchResult(update) Error : {}", batchResult.getBatchResultId(), batchResult.getBatchSchdulId(),
					batchResult.getBatchOpertId(), e.getMessage());
		}
	}

	/**
	 * Batch ?묒뾽???ㅽ뻾???꾩뿉 Batch寃곌낵 '?먮윭'?곹깭濡???ν븳??
	 *
	 * @param jobContext JobExecutionContext
	 *
	 * @see org.quartz.JobListener#jobExecutionVetoed(JobExecutionContext jobContext)
	 */
	@Override
	public void jobExecutionVetoed(JobExecutionContext jobContext) {
		LOGGER.debug("job[{}] jobExecutionVetoed", jobContext.getJobDetail().getKey().getName());

		BatchResult batchResult = new BatchResult();
		JobDataMap dataMap = jobContext.getJobDetail().getJobDataMap();
		try {
			// 寃곌낵 媛??명똿.
			batchResult.setBatchResultId(dataMap.getString("batchResultId"));
			batchResult.setBatchSchdulId(dataMap.getString("batchSchdulId"));
			batchResult.setBatchOpertId(dataMap.getString("batchOpertId"));
			batchResult.setParamtr(dataMap.getString("paramtr"));
			// ?ㅼ?以꾨윭媛 諛곗튂?묒뾽???ㅽ뻾?섏? ?딆쓬.
			batchResult.setSttus("02");
			batchResult.setErrorInfo("?ㅼ?以꾨윭媛 諛곗튂?묒뾽???ㅽ뻾?섏? ?딆븯?듬땲??jobExecutionVetoed ?대깽??. ?ㅼ?以꾨윭 濡쒓렇瑜??뺤씤?섏꽭??);

			String executEndTimeStr = null;
			Date executEndTime = new Date();
			SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss", Locale.getDefault());
			executEndTimeStr = formatter.format(executEndTime);
			batchResult.setExecutEndTime(executEndTimeStr);

			batchResult.setLastUpdusrId("SYSTEM");

			egovBatchSchdulService.updateBatchResult(batchResult);

			// ??μ씠 ?댁긽?놁씠 ?꾨즺?섎㈃  datamap??諛곗튂寃곌낵ID瑜???ν븳??
			dataMap.put("batchResultId", batchResult.getBatchResultId());
		} catch (ClassCastException e) {//KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
			LOGGER.error("[ClassCastException] 諛곗튂寃곌낵ID : {}, 諛곗튂?ㅼ?以껱D : {}, 諛곗튂?묒뾽ID : {}, 諛곗튂寃곌낵???update) ?먮윭 : {}", batchResult.getBatchResultId(), batchResult.getBatchSchdulId(),
					batchResult.getBatchOpertId(), e.getMessage());
			LOGGER.error("[ClassCastException] ["+ e.getClass() + "] BatchResultID : {}, BatchScheduleID : {}, BatchJobID : {}, BatchResult(update) Error : {}", batchResult.getBatchResultId(), batchResult.getBatchSchdulId(),
					batchResult.getBatchOpertId(), e.getMessage());
		} catch (Exception e) {
			//2017.02.06 	?댁젙? 	?쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
			LOGGER.error("(Ko) 諛곗튂寃곌낵ID : {}, 諛곗튂?ㅼ?以껱D : {}, 諛곗튂?묒뾽ID : {}, 諛곗튂寃곌낵???update) ?먮윭 : {}", batchResult.getBatchResultId(), batchResult.getBatchSchdulId(),
					batchResult.getBatchOpertId(), e.getMessage());
			LOGGER.error("(En) ["+ e.getClass() +"] BachResultID : {}, BatchScheduleID : {}, 諛곗튂?묒뾽ID : {}, 諛곗튂寃곌낵???update) ?먮윭 : {}", batchResult.getBatchResultId(), batchResult.getBatchSchdulId(),
					batchResult.getBatchOpertId(), e.getMessage());
		}

	}

}
