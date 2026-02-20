package egovframework.com.sym.sym.bak.service;

import java.sql.SQLException;
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
 * 諛깆뾽?묒뾽???ㅽ뻾?쒖옉, ?꾨즺瑜???ν븯??Quartz JobListener ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * @author 源吏꾨쭔
 * @see
 * <pre>
 * == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??             ?섏젙??           ?섏젙?댁슜
 *  ----------   --------   ---------------------------
 *  2010.09.06   源吏꾨쭔            理쒖큹 ?앹꽦
 *  2017-02-13   ?댁젙?            ?쒗걧?댁퐫??ES) - ?쒗걧?댁퐫??遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
 *  2019.12.09   ?좎슜??           KISA 蹂댁븞?쎌젏 議곗튂 (遺?곸젅???덉쇅泥섎━)
 * </pre>
 */

public class BackupJobListener implements JobListener {

	/** egovBackupOpertService */
	private EgovBackupOpertService egovBackupOpertService;

	/** ID Generation */
	private EgovIdGnrService idgenService;

	/** logger */
	private static final Logger LOGGER = LoggerFactory.getLogger(BackupJobListener.class);

	/**
	 * 諛깆뾽?묒뾽 ?쒕퉬?ㅻ? ?ㅼ젙?쒕떎.
	 *
	 * @param egovBackupOpertService the egovBackupOpertService to set
	 */
	public void setEgovBackupOpertService(EgovBackupOpertService egovBackupOpertService) {
		this.egovBackupOpertService = egovBackupOpertService;
	}

	/**
	 * 諛깆뾽寃곌낵ID ?앹꽦?쒕퉬??
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
	 * 諛깆뾽 ?묒뾽???ㅽ뻾?섍린?꾩뿉 諛깆뾽寃곌낵 '?섑뻾以??곹깭濡???ν븳??
	 *
	 * @param jobContext JobExecutionContext
	 * @see org.quartz.JobListener#jobToBeExecuted(JobExecutionContext jobContext)
	 */
	@Override
	public void jobToBeExecuted(JobExecutionContext jobContext) {
		LOGGER.debug("job[{}] jobToBeExecuted", jobContext.getJobDetail().getKey().getName());
		BackupResult backupResult = new BackupResult();
		JobDataMap dataMap = jobContext.getJobDetail().getJobDataMap();
		try {
			// 寃곌낵 媛??명똿.
			backupResult.setBackupResultId(idgenService.getNextStringId());
			backupResult.setBackupOpertId(dataMap.getString("backupOpertId"));
			backupResult.setBackupFile(dataMap.getString("backupFile"));
			backupResult.setSttus("03"); // ?곹깭???섑뻾以?
			backupResult.setErrorInfo("");

			String executBeginTimeStr = null;
			Date executBeginTime = new Date();
			SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss", Locale.getDefault());
			executBeginTimeStr = formatter.format(executBeginTime);
			backupResult.setExecutBeginTime(executBeginTimeStr);

			backupResult.setLastUpdusrId("SYSTEM");
			backupResult.setFrstRegisterId("SYSTEM");

			String backupOpertId = backupResult.getBackupOpertId();
			if (backupOpertId != null && !backupOpertId.trim().isEmpty()) {
				egovBackupOpertService.insertBackupResult(backupResult);
			} else {
				LOGGER.error("Backup Result's Backup Operation ID is null or empty. Cannot insert backup result.");
			}

			// ??μ씠 ?댁긽?놁씠 ?꾨즺?섎㈃  datamap??諛곗튂寃곌낵ID瑜???ν븳??
			dataMap.put("backupResultId", backupResult.getBackupResultId());
		} catch (FdlException e) {//KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
			LOGGER.error("(Ko)諛깆뾽?묒뾽ID : {}, idgenService.getNextStringId() ?먮윭 : {}", backupResult.getBackupOpertId(), e.getMessage());
			LOGGER.error("(En)["+ e.getClass() + "] BackupJobID : {}, BatchResult(insert) Error : {}", backupResult.getBackupOpertId(), e.getMessage());
		} catch (Exception e) {
			//2017.02.13 	?댁젙? 	?쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
			LOGGER.error("(Ko)諛깆뾽?묒뾽ID : {}, 諛곗튂寃곌낵???insert) ?먮윭 : {}", backupResult.getBackupOpertId(), e.getMessage());
			LOGGER.error("(En)["+ e.getClass() + "] BackupJobID : {}, BatchResult(insert) Error : {}", backupResult.getBackupOpertId(), e.getMessage());
		}

	}

	/**
	 * 諛깆뾽 ?묒뾽???꾨즺?쒗썑 諛깆뾽寃곌낵 '?꾨즺'?곹깭濡???ν븳??
	 *
	 * @param jobContext JobExecutionContext
	 * @see org.quartz.JobListener#jobWasExecuted(JobExecutionContext jobContext)
	 */
	@Override
	public void jobWasExecuted(JobExecutionContext jobContext, JobExecutionException jee) {
		LOGGER.debug("job[{}] jobWasExecuted", jobContext.getJobDetail().getKey().getName());
		LOGGER.debug("job[{}] ?섑뻾?쒓컙 : {}, {}", jobContext.getJobDetail().getKey().getName(), jobContext.getFireTime(), jobContext.getJobRunTime());

		boolean jobResult = false;
		BackupResult backupResult = new BackupResult();
		JobDataMap dataMap = jobContext.getJobDetail().getJobDataMap();
		try {
			// 寃곌낵 媛??명똿.
			backupResult.setBackupResultId(dataMap.getString("backupResultId"));
			backupResult.setBackupOpertId(dataMap.getString("backupOpertId"));
			if (jobContext.getResult() != null) {
				jobResult = (Boolean) jobContext.getResult();
			}
			if (jobResult) {
				// 諛깆뾽?묒뾽 ?깃났.
				backupResult.setSttus("01");
				backupResult.setErrorInfo("");
				backupResult.setBackupFile(dataMap.getString("backupFile"));
			} else {
				// 諛깆뾽?묒뾽??true媛 ?꾨땶媛믪쓣 由ы꽩?섎㈃ ?먮윭 ?곹솴??
				backupResult.setSttus("02");
				backupResult.setErrorInfo("諛깆뾽?묒뾽???ㅽ뙣?덉뒿?덈떎. \n" + "諛깆뾽?묒뾽 [" + dataMap.getString("backupOpertId") + "]??濡쒓렇瑜??뺤씤?섏꽭??);
			}
			// ?섑뻾以?exception??諛쒖깮??寃쎌슦
			if (jee != null) {
				LOGGER.error("JobExecutionException 諛쒖깮 : {}", jee);
				backupResult.setSttus("02");
				String errorInfo = backupResult.getErrorInfo();
				backupResult.setErrorInfo(errorInfo + "\n" + "JobExecutionException 諛쒖깮 : " + jee);
			}

			String executEndTimeStr = null;
			Date executEndTime = new Date();
			SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss", Locale.getDefault());
			executEndTimeStr = formatter.format(executEndTime);
			backupResult.setExecutEndTime(executEndTimeStr);

			backupResult.setLastUpdusrId("SYSTEM");

			LOGGER.debug("insert BackupResult Data : {}", backupResult);
			LOGGER.debug("backupFile : {}", dataMap.getString("backupFile"));
			egovBackupOpertService.updateBackupResult(backupResult);

			// ??μ씠 ?댁긽?놁씠 ?꾨즺?섎㈃  datamap??諛곗튂寃곌낵ID瑜???ν븳??
			dataMap.put("backupResultId", backupResult.getBackupResultId());
		} catch (SQLException e) {
			LOGGER.error("(Ko)諛깆뾽寃곌낵ID : {}, 諛깆뾽?묒뾽ID : {}, 諛곗튂寃곌낵???update) ?먮윭 : {}", backupResult.getBackupResultId(), backupResult.getBackupOpertId(), e.getMessage());
			LOGGER.error("(En) ["+ e.getClass() + "] BackupResultID : {}, BackupJobID : {}, BatchResult(update) Error : {}", backupResult.getBackupResultId(), backupResult.getBackupOpertId(), e.getMessage());
		} catch (Exception e) {
			//2017.02.13 	?댁젙? 	?쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
			LOGGER.error("(Ko)諛깆뾽寃곌낵ID : {}, 諛깆뾽?묒뾽ID : {}, 諛곗튂寃곌낵???update) ?먮윭 : {}", backupResult.getBackupResultId(), backupResult.getBackupOpertId(), e.getMessage());
			LOGGER.error("(En) ["+ e.getClass() + "] BackupResultID : {}, BackupJobID : {}, BatchResult(update) Error : {}", backupResult.getBackupResultId(), backupResult.getBackupOpertId(), e.getMessage());
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

		BackupResult backupResult = new BackupResult();
		JobDataMap dataMap = jobContext.getJobDetail().getJobDataMap();
		try {
			// 寃곌낵 媛??명똿.
			backupResult.setBackupResultId(dataMap.getString("backupResultId"));
			backupResult.setBackupOpertId(dataMap.getString("backupOpertId"));
			backupResult.setBackupFile(dataMap.getString("backupFile"));
			// ?ㅼ?以꾨윭媛 諛곗튂?묒뾽???ㅽ뻾?섏? ?딆쓬.
			backupResult.setSttus("02");
			backupResult.setErrorInfo("?ㅼ?以꾨윭媛 諛곗튂?묒뾽???ㅽ뻾?섏? ?딆븯?듬땲??jobExecutionVetoed ?대깽??. ?ㅼ?以꾨윭 濡쒓렇瑜??뺤씤?섏꽭??);

			String executEndTimeStr = null;
			Date executEndTime = new Date();
			SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss", Locale.getDefault());
			executEndTimeStr = formatter.format(executEndTime);
			backupResult.setExecutEndTime(executEndTimeStr);

			backupResult.setLastUpdusrId("SYSTEM");

			egovBackupOpertService.updateBackupResult(backupResult);

			// ??μ씠 ?댁긽?놁씠 ?꾨즺?섎㈃  datamap??諛곗튂寃곌낵ID瑜???ν븳??
			dataMap.put("backupResultId", backupResult.getBackupResultId());
		} catch (SQLException e) {
			LOGGER.error("(Ko) 諛깆뾽寃곌낵ID : {}, 諛깆뾽?묒뾽ID : {}, 諛곗튂寃곌낵???update) ?먮윭 : {}", backupResult.getBackupResultId(), backupResult.getBackupOpertId(), e.getMessage());
			LOGGER.error("(En) ["+ e.getClass() + "] BackupResultID : {}, BackupJobID : {}, BatchResult(update) Error : {}", backupResult.getBackupResultId(), backupResult.getBackupOpertId(), e.getMessage());
		} catch (Exception e) {
			//2017.02.13 	?댁젙? 	?쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
			LOGGER.error("(Ko) 諛깆뾽寃곌낵ID : {}, 諛깆뾽?묒뾽ID : {}, 諛곗튂寃곌낵???update) ?먮윭 : {}", backupResult.getBackupResultId(), backupResult.getBackupOpertId(), e.getMessage());
			LOGGER.error("(En) ["+ e.getClass() + "] BackupResultID : {}, BackupJobID : {}, BatchResult(update) Error : {}", backupResult.getBackupResultId(), backupResult.getBackupOpertId(), e.getMessage());
		}

	}

}
