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
 * Quartz Scheduler瑜??ㅽ뻾?섎뒗 ?ㅼ?以꾨윭 ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * @author 源吏꾨쭔
 * @see
 * <pre>
 * == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??      ?섏젙??          ?섏젙?댁슜
 *  -------     --------    ---------------------------
 *  2010.08.30   源吏꾨쭔     理쒖큹 ?앹꽦
 *  2024.10.29	LeeBaekHaeng	遺덊븘??@SuppressWarnings("unchecked") 諛??뺣????쒓굅
 * </pre>
 */

public class BatchScheduler {

	private EgovBatchSchdulService egovBatchSchdulService;

	/** ID Generation */
	private EgovIdGnrService idgenService;

	/** Quartz ?ㅼ?以꾨윭 */
	private Scheduler sched;

	private static final Logger LOGGER = LoggerFactory.getLogger(BatchScheduler.class);

	// ?ㅽ뻾 ??곸쓣 ?쎄린?꾪븳 ?섏씠吏 ?ш린
	private static final int RECORD_COUNT_PER_PAGE = 10000;

	/**
	 * 諛곗튂?ㅼ?以꾨윭??batchSchdul ?뚮씪誘명꽣瑜??댁슜?섏뿬 Job , Trigger瑜?Add ?쒕떎.
	 *
	 * @param batchSchdul  諛곗튂?ㅼ?以꾨윭???깅줉???ㅼ?以꾩젙蹂?
	 * @exception Exception Exception
	 */
	public void insertBatchSchdul(BatchSchdul batchSchdul) throws Exception {
		// Job 留뚮뱾湲?
		JobDetail jobDetail = newJob(BatchShellScriptJob.class).withIdentity(batchSchdul.getBatchSchdulId()).build();

		// Trigger 留뚮뱾湲?
		CronTrigger trigger = newTrigger().withIdentity(batchSchdul.getBatchSchdulId()).withSchedule(cronSchedule(batchSchdul.toCronExpression())).forJob(jobDetail.getKey().getName()).build();

		LOGGER.debug("諛곗튂?ㅼ?以꾩쓣 ?깅줉?⑸땲?? 諛곗튂?ㅼ?以껱D : {}", batchSchdul.getBatchSchdulId());
		LOGGER.debug("{} - cronexpression : {}", batchSchdul.getBatchSchdulId(), trigger.getCronExpression());
		BatchJobListener listener = new BatchJobListener();

		listener.setEgovBatchSchdulService(egovBatchSchdulService);
		listener.setIdgenService(idgenService);

		sched.getListenerManager().addJobListener(listener);

		// ?곗씠???꾨떖
		jobDetail.getJobDataMap().put("batchOpertId", batchSchdul.getBatchOpertId());
		jobDetail.getJobDataMap().put("batchSchdulId", batchSchdul.getBatchSchdulId());
		jobDetail.getJobDataMap().put("batchProgrm", batchSchdul.getBatchProgrm());
		jobDetail.getJobDataMap().put("paramtr", batchSchdul.getParamtr());

		try {
			// ?ㅼ?以꾨윭??異붽??섍린
			sched.scheduleJob(jobDetail, trigger);
		} catch (SchedulerException e) {
			// SchedulerException ??諛쒖깮?섎㈃ 濡쒓렇瑜?異쒕젰?섍퀬 ?ㅼ쓬 諛곗튂?묒뾽?쇰줈 ?섏뼱媛꾨떎.
			// ?몃━嫄곗쓽 ?ㅽ뻾?쒓컖???꾩옱 ?쒓컖蹂대떎 ?댁쟾?대㈃ SchedulerException??諛쒖깮?쒕떎.
			LOGGER.error("?ㅼ?以꾨윭??諛곗튂?묒뾽異붽??좊븣 ?먮윭媛 諛쒖깮?덉뒿?덈떎. 諛곗튂?ㅼ?以껱D : {}, 諛곗튂?묒뾽ID : {}", batchSchdul.getBatchSchdulId(), batchSchdul.getBatchOpertId());
			LOGGER.error("?먮윭?댁슜 : {}", e.getMessage());
			//LOGGER.debug(e.getMessage(), e);
		}
	}

	/**
	 * 諛곗튂?ㅼ?以꾨윭??batchSchdul ?뚮씪誘명꽣瑜??댁슜?섏뿬 Job , Trigger瑜?媛깆떊 ?쒕떎.
	 *
	 * @param batchSchdul  諛곗튂?ㅼ?以꾨윭??媛깆떊???ㅼ?以꾩젙蹂?
	 * @exception Exception Exception
	 */
	public void updateBatchSchdul(BatchSchdul batchSchdul) throws Exception {
		// Job 留뚮뱾湲?
		JobDetail jobDetail = newJob(BatchShellScriptJob.class).withIdentity(batchSchdul.getBatchSchdulId()).build();
		// Trigger 留뚮뱾湲?
		CronTrigger trigger = newTrigger().withIdentity(batchSchdul.getBatchSchdulId()).withSchedule(cronSchedule(batchSchdul.toCronExpression())).forJob(jobDetail.getKey().getName()).build();

		LOGGER.debug("諛곗튂?ㅼ?以꾩쓣 媛깆떊?⑸땲?? 諛곗튂?ㅼ?以껱D : {}", batchSchdul.getBatchSchdulId());
		LOGGER.debug("{} - cronexpression : {}", batchSchdul.getBatchSchdulId(), trigger.getCronExpression());

		BatchJobListener listener = new BatchJobListener();

		listener.setEgovBatchSchdulService(egovBatchSchdulService);
		listener.setIdgenService(idgenService);

		sched.getListenerManager().addJobListener(listener);

		// ?곗씠???꾨떖
		jobDetail.getJobDataMap().put("batchOpertId", batchSchdul.getBatchOpertId());
		jobDetail.getJobDataMap().put("batchSchdulId", batchSchdul.getBatchSchdulId());
		jobDetail.getJobDataMap().put("batchProgrm", batchSchdul.getBatchProgrm());
		jobDetail.getJobDataMap().put("paramtr", batchSchdul.getParamtr());

		try {
			// ?ㅼ?以꾨윭?먯꽌 湲곗〈Job, Trigger ??젣?섍린
			sched.deleteJob(JobKey.jobKey(batchSchdul.getBatchSchdulId()));
			// ?ㅼ?以꾨윭??異붽??섍린
			sched.scheduleJob(jobDetail, trigger);
		} catch (SchedulerException e) {
			// SchedulerException ??諛쒖깮?섎㈃ 濡쒓렇瑜?異쒕젰?섍퀬 ?ㅼ쓬 諛곗튂?묒뾽?쇰줈 ?섏뼱媛꾨떎.
			// ?몃━嫄곗쓽 ?ㅽ뻾?쒓컖???꾩옱 ?쒓컖蹂대떎 ?댁쟾?대㈃ SchedulerException??諛쒖깮?쒕떎.
			LOGGER.error("?ㅼ?以꾨윭??諛곗튂?묒뾽媛깆떊?좊븣 ?먮윭媛 諛쒖깮?덉뒿?덈떎. 諛곗튂?ㅼ?以껱D : {}, 諛곗튂?묒뾽ID : {}", batchSchdul.getBatchSchdulId(), batchSchdul.getBatchOpertId());
			LOGGER.error("?먮윭?댁슜 : {}", e.getMessage());
			//LOGGER.debug(e.getMessage(), e);
		}
	}

	/**
	 * 諛곗튂?ㅼ?以꾨윭??batchSchdul ?뚮씪誘명꽣瑜??댁슜?섏뿬 Job , Trigger瑜???젣?쒕떎.
	 *
	 * @param batchSchdul  諛곗튂?ㅼ?以꾨윭????젣???ㅼ?以꾩젙蹂?
	 * @exception Exception Exception
	 */
	public void deleteBatchSchdul(BatchSchdul batchSchdul) throws Exception {

		try {
			// ?ㅼ?以꾨윭?먯꽌 湲곗〈Job, Trigger ??젣?섍린
			LOGGER.debug("諛곗튂?ㅼ?以꾩쓣 ??젣?⑸땲?? 諛곗튂?ㅼ?以껱D : {}", batchSchdul.getBatchSchdulId());
			sched.deleteJob(JobKey.jobKey(batchSchdul.getBatchSchdulId()));
		} catch (SchedulerException e) {
			// SchedulerException ??諛쒖깮?섎㈃ 濡쒓렇瑜?異쒕젰?섍퀬 ?ㅼ쓬 諛곗튂?묒뾽?쇰줈 ?섏뼱媛꾨떎.
			// ?몃━嫄곗쓽 ?ㅽ뻾?쒓컖???꾩옱 ?쒓컖蹂대떎 ?댁쟾?대㈃ SchedulerException??諛쒖깮?쒕떎.
			LOGGER.error("?ㅼ?以꾨윭??諛곗튂?묒뾽????젣?좊븣 ?먮윭媛 諛쒖깮?덉뒿?덈떎. 諛곗튂?ㅼ?以껱D : {}, 諛곗튂?묒뾽ID : ", batchSchdul.getBatchSchdulId(), batchSchdul.getBatchOpertId());
			LOGGER.error("?먮윭?댁슜 : {}", e.getMessage());
			//LOGGER.debug(e.getMessage(), e);
		}
	}

	/**
	 * ?대옒??珥덇린?붾찓?뚮뱶.
	 * 諛곗튂?ㅼ?以꾪뀒?대툝???쎌뼱??Quartz ?ㅼ?以꾨윭瑜?珥덇린?뷀븳??
	 *
	 */
	public void init() throws Exception {
		// 紐⑤땲?곕쭅 ????뺣낫 ?쎌뼱?ㅼ씠湲?~~
		List<BatchSchdul> targetList = null;
		BatchSchdul searchVO = new BatchSchdul();
		// 紐⑤땲?곕쭅 ???寃??議곌굔 珥덇린??
		searchVO.setPageIndex(1);
		searchVO.setFirstIndex(0);
		searchVO.setRecordCountPerPage(RECORD_COUNT_PER_PAGE);
		targetList = egovBatchSchdulService.selectBatchSchdulList(searchVO);
		LOGGER.debug("議고쉶議곌굔 {}", searchVO);
		LOGGER.debug("Result 嫄댁닔 : {}", targetList.size());

		// ?ㅼ?以꾨윭 ?앹꽦?섍린
		SchedulerFactory schedFact = new org.quartz.impl.StdSchedulerFactory();
		sched = schedFact.getScheduler();

		// Set up the listener
		BatchJobListener listener = new BatchJobListener();

		listener.setEgovBatchSchdulService(egovBatchSchdulService);
		listener.setIdgenService(idgenService);

		//sched.addGlobalJobListener(listener);
		sched.getListenerManager().addJobListener(listener);

		// ?ㅼ?以꾨윭??Job, Trigger ?깅줉?섍린
		BatchSchdul target = null;
		for (BatchSchdul element : targetList) {
			target = element;
			LOGGER.debug("Data : {}", target);

			insertBatchSchdul(target);
		}

		sched.start();
	}

	/**
	 * ?대옒??destroy硫붿냼??
	 * Quartz ?ㅼ?以꾨윭瑜?shutdown?쒕떎.
	 *
	 */
	public void destroy() throws Exception {
		sched.shutdown();
	}

	/**
	 * 諛곗튂?ㅼ?以??쒕퉬??由ы꽩
	 * @return the egovBatchSchdulService
	 */
	public EgovBatchSchdulService getEgovBatchSchdulService() {
		return egovBatchSchdulService;
	}

	/**
	 * 諛곗튂?ㅼ?以??쒕퉬?????
	 * @param egovBatchSchdulService the egovBatchSchdulService to set
	 */
	public void setEgovBatchSchdulService(EgovBatchSchdulService egovBatchSchdulService) {
		this.egovBatchSchdulService = egovBatchSchdulService;
	}

	/**
	 * 諛곗튂寃곌낵ID ?앹꽦?쒕퉬??由ы꽩
	 * @return the idgenService
	 */
	public EgovIdGnrService getIdgenService() {
		return idgenService;
	}

	/**
	 * 諛곗튂寃곌낵ID ?앹꽦?쒕퉬?????
	 * @param idgenService the idgenService to set
	 */
	public void setIdgenService(EgovIdGnrService idgenService) {
		this.idgenService = idgenService;
	}
}
