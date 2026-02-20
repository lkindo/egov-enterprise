package egovframework.com.utl.sys.trm.service;

import java.util.Iterator;
import java.util.List;

import org.apache.commons.lang3.StringUtils;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailSender;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.stereotype.Service;

import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;

/**
 * @Class Name : EgovTrsmrcvMntrngScheduling.java
 * @Description : ???????? ??????????
 * @Modification Information
 *
 *               ????????????
 *               ------- ------- -------------------
 *               2010.08.16 ????
 *               2022.11.11 ??? ????????
 *
 * @author ?
 * @version
 * @see
 *
 **/
@Service("egovTrsmrcvMntrngScheduling")
public class EgovTrsmrcvMntrngScheduling extends EgovAbstractServiceImpl {

	@Resource(name = "egovTrsmrcvMntrngService")
	private EgovTrsmrcvMntrngService trsmrcvMntrngService;

	@Resource(name = "mntrngMailSender")
	private MailSender mntrngMailSender;

	@Resource(name = "mntrngMessage")
	private SimpleMailMessage mntrngMessage;

	/** ID Generation **/
	@Resource(name = "egovTrsmrcvMntrngLogIdGnrService")
	private EgovIdGnrService idgenService;

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovTrsmrcvMntrngScheduling.class);

	// ?? ??? ??? ?? ???
	private static final int RECORD_COUNT_PER_PAGE = 10000;

	/**
	 * ????????????.
	 *
	 * @param
	 * @return
	 * @throws Exception
	 **/
	public void monitor() throws Exception {
		// ?? ????? ?????~~
		List<TrsmrcvMntrng> targetList = null;
		TrsmrcvMntrng searchVO = new TrsmrcvMntrng();
		// ?? ??????????
		searchVO.setPageIndex(1);
		searchVO.setFirstIndex(0);
		searchVO.setRecordCountPerPage(RECORD_COUNT_PER_PAGE);
		targetList = trsmrcvMntrngService.selectTrsmrcvMntrngList(searchVO);
		LOGGER.debug("         ?   ?          {}", searchVO);
		LOGGER.debug("Result          ??: {}", targetList.size());
		// ???????? ?.
		Iterator<TrsmrcvMntrng> iter = targetList.iterator();
		TrsmrcvMntrng target = null;
		TrsmrcvMntrngResult result = null;
		TrsmrcvMntrngLog trsmrcvMntrngLog = null;
		String trsmrcvMntrngLogId = null;
		Class<?> klass = null;
		TrsmrcvMntrngChecker checker = null;
		while (iter.hasNext()) {
			target = iter.next();
			LOGGER.debug("Data : {}", target);

			try {
				// Checker ???????.
				klass = Class.forName(target.getTestClassNm());
				checker = (TrsmrcvMntrngChecker) klass.getDeclaredConstructor().newInstance();
				LOGGER.debug("Just made: {}", checker);
				// ???????.
				result = checker.check(target.getCntcId());
				LOGGER.debug("Result Data: {}", checker);
			} catch (ClassNotFoundException e) {
				LOGGER.error("??      ?         ??         ?Checker??  ?????      ?   ?   ", e);
				result = new TrsmrcvMntrngResult(false, e);
			} catch (IllegalAccessException e) {
				LOGGER.error("??      ?         ??         ?Checker??  ?????      ?   ?   ", e);
				result = new TrsmrcvMntrngResult(false, e);
			} catch (InstantiationException e) {
				LOGGER.error("??      ?         ??         ?Checker??  ?????      ?   ?   ", e);
				result = new TrsmrcvMntrngResult(false, e);
			}

			// ????????DB????????

			if (result != null && result.isNrmltAt()) {
				target.setMntrngSttus("01");
			} else {
				target.setMntrngSttus("02");
			}
			target.setLastUpdusrId("SYSTEM");
			trsmrcvMntrngService.updateTrsmrcvMntrng(target);
			// ????????????
			trsmrcvMntrngLog = new TrsmrcvMntrngLog();
			trsmrcvMntrngLogId = idgenService.getNextStringId();
			trsmrcvMntrngLog.setLogId(trsmrcvMntrngLogId);
			trsmrcvMntrngLog.setCntcId(target.getCntcId());
			trsmrcvMntrngLog.setTestClassNm(target.getTestClassNm());
			trsmrcvMntrngLog.setMngrNm(target.getMngrNm());
			trsmrcvMntrngLog.setMngrEmailAddr(target.getMngrEmailAddr());
			trsmrcvMntrngLog.setMntrngSttus(target.getMntrngSttus());
			trsmrcvMntrngLog.setFrstRegisterId("SYSTEM");
			trsmrcvMntrngLog.setLastUpdusrId("SYSTEM");

			if (result != null && result.getCause() != null) {
				LOGGER.debug("?   ?            ?      ?: {}", result.getCause().getMessage());

				if (result.getCause().getMessage() != null) {
					trsmrcvMntrngLog
							.setLogInfo(
									result.getCause().getClass().getName() + " - " + result.getCause().getMessage());
				} else {
					trsmrcvMntrngLog.setLogInfo("");
				}

			} else {
				trsmrcvMntrngLog.setLogInfo("");
			}
			LOGGER.debug("insert????      ?         ??                        ?Data : {}", trsmrcvMntrngLog);
			trsmrcvMntrngService.insertTrsmrcvMntrngLog(trsmrcvMntrngLog);

			// ?????????????????
			trsmrcvMntrngLog = trsmrcvMntrngService.selectTrsmrcvMntrngLog(trsmrcvMntrngLog);
			LOGGER.debug(" email?         ????      ?         ??                        ?Data : {}", trsmrcvMntrngLog);

			// email ?.
			if (result != null && !result.isNrmltAt()) { // 2022.01. Possible null pointer dereference
				sendEmail(trsmrcvMntrngLog);
			}

		} /* end of while */

	}

	/**
	 * ???? ???.
	 *
	 * @param mntrngLog ?? ????
	 * @return
	 *
	 **/
	private void sendEmail(TrsmrcvMntrngLog mntrngLog) {
		String subject = "";
		String text = "";
		String errorContents = "";

		SimpleMailMessage msg = new SimpleMailMessage(this.mntrngMessage);
		// ????
		msg.setTo(mntrngLog.getMngrEmailAddr());
		// ???
		subject = msg.getSubject();
		// 2022.11.11 ????????
		if (StringUtils.isNotEmpty(subject)) {
			subject = EgovStringUtil.replace(subject, "{         ??         ?         ?", "??      ?         ??         ?);");
			msg.setSubject(subject);
		}
		// ???
		text = msg.getText();
		// 2022.11.11 ????????
		if (StringUtils.isNotEmpty(text)) {
			text = EgovStringUtil.replace(text, "{         ??         ?         ?", "??      ?         ??         ?);");
			errorContents = "?           D : " + mntrngLog.getCntcId() + "\n";
			errorContents = errorContents + "?              ?: " + mntrngLog.getCntcNm() + "\n";
			errorContents = errorContents + "???   ?         ??         ?: " + mntrngLog.getTestClassNm() + "\n";
			errorContents = errorContents + "?          : " + mntrngLog.getMntrngSttusNm() + "\n";
			errorContents = errorContents + "         ??         ??       : " + mntrngLog.getCreatDt() + "\n";
			errorContents = errorContents + "?   ?            ?      ? : " + mntrngLog.getLogInfo() + "\n";
			text = EgovStringUtil.replace(text, "{?   ?   ??      }", errorContents);
			msg.setText(text);
		}

		this.mntrngMailSender.send(msg);
	}

}
