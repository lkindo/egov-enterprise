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
 *  2010.09.06   源吏꾨쭔     理쒖큹 ?앹꽦
 * </pre>
 */

public class BackupScheduler {

	/** egovBackupOpertService */
	private EgovBackupOpertService egovBackupOpertService;

    /** ID Generation */
	private EgovIdGnrService idgenService;

	/** Quartz ?ㅼ?以꾨윭 */
	private Scheduler sched;
	/** logger */
	private static final Logger LOGGER = LoggerFactory.getLogger(BackupScheduler.class);

	// ?ㅽ뻾 ??곸쓣 ?쎄린?꾪븳 ?섏씠吏 ?ш린
	private static final int RECORD_COUNT_PER_PAGE = 10000;

	/**
	 * 諛깆뾽?ㅼ?以꾨윭??backupOpert ?뚮씪誘명꽣瑜??댁슜?섏뿬 Job , Trigger瑜?Add ?쒕떎.
	 *
	 * @param backupOpert  諛깆뾽?ㅼ?以꾨윭???깅줉??諛깆뾽?묒뾽?뺣낫
	 * @exception Exception Exception
	 */
	public void insertBackupOpert(BackupOpert backupOpert) throws Exception {
		LOGGER.debug("諛깆뾽?ㅼ?以꾩쓣 ?깅줉?⑸땲?? 諛깆뾽?묒뾽ID : {}", backupOpert.getBackupOpertId() );

		// Job 留뚮뱾湲?
		JobDetail jobDetail = newJob(BackupJob.class)
				 			.withIdentity(backupOpert.getBackupOpertId())
				 			//.storeDurably()
				 			//.requestRecovery()
				 			//.usingJobData("someKey", "someValue")
				 			.build();

		// Trigger 留뚮뱾湲?
		CronTrigger trigger = newTrigger()
			    .withIdentity(backupOpert.getBackupOpertId())
			    .withSchedule(cronSchedule(backupOpert.toCronExpression()))
			    .forJob(jobDetail.getKey().getName())
			    .build();

		LOGGER.debug("{} - cronexpression : {}", backupOpert.getBackupOpertId(), trigger.getCronExpression());

		BackupJobListener listener = new BackupJobListener();

        listener.setEgovBackupOpertService(egovBackupOpertService);
        listener.setIdgenService(idgenService);

		sched.getListenerManager().addJobListener(listener);

		// ?곗씠???꾨떖
		jobDetail.getJobDataMap().put("backupOpertId", backupOpert.getBackupOpertId());
		jobDetail.getJobDataMap().put("backupOrginlDrctry", backupOpert.getBackupOrginlDrctry());
		jobDetail.getJobDataMap().put("backupStreDrctry", backupOpert.getBackupStreDrctry());
		jobDetail.getJobDataMap().put("cmprsSe", backupOpert.getCmprsSe());

		try {
			// ?ㅼ?以꾨윭??異붽??섍린
			sched.scheduleJob(jobDetail, trigger);
		} catch (SchedulerException e) {
			// SchedulerException ??諛쒖깮?섎㈃ 濡쒓렇瑜?異쒕젰?섍퀬 ?ㅼ쓬 諛깆뾽?묒뾽?쇰줈 ?섏뼱媛꾨떎.
			// ?몃━嫄곗쓽 ?ㅽ뻾?쒓컖???꾩옱 ?쒓컖蹂대떎 ?댁쟾?대㈃ SchedulerException??諛쒖깮?쒕떎.
			LOGGER.error("?ㅼ?以꾨윭??諛깆뾽?묒뾽異붽??좊븣 ?먮윭媛 諛쒖깮?덉뒿?덈떎. 諛깆뾽?묒뾽ID : {}", backupOpert.getBackupOpertId() );
			LOGGER.error("?먮윭?댁슜 : {}", e.getMessage());
			//LOGGER.debug(e.getMessage(), e);
		}
	}

	/**
	 * 諛깆뾽?ㅼ?以꾨윭??backupOpert ?뚮씪誘명꽣瑜??댁슜?섏뿬 Job , Trigger瑜?媛깆떊 ?쒕떎.
	 *
	 * @param backupOpert  諛깆뾽?ㅼ?以꾨윭??媛깆떊??諛깆뾽?묒뾽?뺣낫
	 * @exception Exception Exception
	 */
	public void updateBackupOpert(BackupOpert backupOpert) throws Exception {
		// Job 留뚮뱾湲?
		JobDetail jobDetail = newJob(BackupJob.class)
				 			.withIdentity(backupOpert.getBackupOpertId())
				 			//.storeDurably()
				 			//.requestRecovery()
				 			//.usingJobData("someKey", "someValue")
				 			.build();

		CronTrigger trigger = newTrigger()
			    .withIdentity(backupOpert.getBackupOpertId())
			    .withSchedule(cronSchedule(backupOpert.toCronExpression()))
			    .forJob(jobDetail.getKey().getName())
			    .build();

		LOGGER.debug("{} - cronexpression : {}", backupOpert.getBackupOpertId(), trigger.getCronExpression());

		BackupJobListener listener = new BackupJobListener();

        listener.setEgovBackupOpertService(egovBackupOpertService);
        listener.setIdgenService(idgenService);

		sched.getListenerManager().addJobListener(listener);

		// ?곗씠???꾨떖
		jobDetail.getJobDataMap().put("backupOpertId", backupOpert.getBackupOpertId());
		jobDetail.getJobDataMap().put("backupOrginlDrctry", backupOpert.getBackupOrginlDrctry());
		jobDetail.getJobDataMap().put("backupStreDrctry", backupOpert.getBackupStreDrctry());
		jobDetail.getJobDataMap().put("cmprsSe", backupOpert.getCmprsSe());

		try {
			// ?ㅼ?以꾨윭?먯꽌 湲곗〈Job, Trigger ??젣?섍린
			sched.deleteJob(JobKey.jobKey(backupOpert.getBackupOpertId()));
			// ?ㅼ?以꾨윭??異붽??섍린
			sched.scheduleJob(jobDetail, trigger);
		} catch (SchedulerException e) {
			// SchedulerException ??諛쒖깮?섎㈃ 濡쒓렇瑜?異쒕젰?섍퀬 ?ㅼ쓬 諛곗튂?묒뾽?쇰줈 ?섏뼱媛꾨떎.
			// ?몃━嫄곗쓽 ?ㅽ뻾?쒓컖???꾩옱 ?쒓컖蹂대떎 ?댁쟾?대㈃ SchedulerException??諛쒖깮?쒕떎.
			LOGGER.error("?ㅼ?以꾨윭??諛깆뾽?묒뾽媛깆떊?좊븣 ?먮윭媛 諛쒖깮?덉뒿?덈떎. 諛깆뾽?묒뾽ID : {}", backupOpert.getBackupOpertId() );
			LOGGER.error("?먮윭?댁슜 : {}", e.getMessage());
			//LOGGER.debug(e.getMessage(), e);
		}
	}

	/**
	 * 諛깆뾽?ㅼ?以꾨윭??backupOpert ?뚮씪誘명꽣瑜??댁슜?섏뿬 Job , Trigger瑜???젣?쒕떎.
	 *
	 * @param backupOpert  諛깆뾽?ㅼ?以꾨윭????젣??諛깆뾽?묒뾽?뺣낫
	 * @exception Exception Exception
	 */
	public void deleteBackupOpert(BackupOpert backupOpert) throws Exception {

		try {
			// ?ㅼ?以꾨윭?먯꽌 湲곗〈Job, Trigger ??젣?섍린
			LOGGER.debug("諛깆뾽?묒뾽????젣?⑸땲?? 諛깆뾽?묒뾽ID : {}", backupOpert.getBackupOpertId() );
			sched.deleteJob(JobKey.jobKey(backupOpert.getBackupOpertId()));
		} catch (SchedulerException e) {
			// SchedulerException ??諛쒖깮?섎㈃ 濡쒓렇瑜?異쒕젰?섍퀬 ?ㅼ쓬 諛곗튂?묒뾽?쇰줈 ?섏뼱媛꾨떎.
			LOGGER.error("?ㅼ?以꾨윭??諛깆뾽?묒뾽????젣?좊븣 ?먮윭媛 諛쒖깮?덉뒿?덈떎. 諛곗튂?ㅼ?以껱D : {}", backupOpert.getBackupOpertId() );
			LOGGER.error("?먮윭?댁슜 : {}", e.getMessage());
			//LOGGER.debug(e.getMessage(), e);
		}
	}

	/**
     * ?대옒??珥덇린?붾찓?뚮뱶. 諛곗튂?ㅼ?以꾪뀒?대툝???쎌뼱??Quartz ?ㅼ?以꾨윭瑜?珥덇린?뷀븳??
     *
     */
    public void init() throws Exception {
        BackupOpert searchVO = new BackupOpert();
        // 紐⑤땲?곕쭅 ???寃??議곌굔 珥덇린??
        searchVO.setPageIndex(1);
        searchVO.setFirstIndex(0);
        searchVO.setRecordCountPerPage(RECORD_COUNT_PER_PAGE);
        // 紐⑤땲?곕쭅 ????뺣낫 ?쎌뼱?ㅼ씠湲?~~
        List<BackupOpert> targetList = egovBackupOpertService.selectBackupOpertList(searchVO);
        LOGGER.debug("議고쉶議곌굔 {}", searchVO);
        LOGGER.debug("Result 嫄댁닔 : {}", targetList.size());

        // ?ㅼ?以꾨윭 ?앹꽦?섍린
        SchedulerFactory schedFact = new org.quartz.impl.StdSchedulerFactory();
        sched = schedFact.getScheduler();

        // Set up the listener
		BackupJobListener listener = new BackupJobListener();

        listener.setEgovBackupOpertService(egovBackupOpertService);
        listener.setIdgenService(idgenService);

        sched.getListenerManager().addJobListener(listener);

     // ?ㅼ?以꾨윭??Job, Trigger ?깅줉?섍린
        for (BackupOpert target : targetList) {
            LOGGER.debug("Data : {}", target);

			insertBackupOpert(target);
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
	 * 諛깆뾽?묒뾽?쒕퉬??由ы꽩
	 * @return the egovBackupSchdulService
	 */
	public EgovBackupOpertService getEgovBackupOpertService() {
		return egovBackupOpertService;
	}

	/**
	 * 諛깆뾽?묒뾽?쒕퉬?????
	 * @param egovBackupOpertService the egovBackupOpertService to set
	 */
	public void setEgovBackupOpertService(
			EgovBackupOpertService egovBackupOpertService) {
		this.egovBackupOpertService = egovBackupOpertService;
	}

	/**
	 * 諛깆뾽寃곌낵ID ?앹꽦?쒕퉬??由ы꽩
	 * @return the idgenService
	 */
	public EgovIdGnrService getIdgenService() {
		return idgenService;
	}

	/**
	 * 諛깆뾽寃곌낵ID ?앹꽦?쒕퉬?????
	 * @param idgenService the idgenService to set
	 */
	public void setIdgenService(EgovIdGnrService idgenService) {
		this.idgenService = idgenService;
	}

}
