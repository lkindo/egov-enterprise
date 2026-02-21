package egovframework.com.utl.sys.dbm.service;

import java.util.Iterator;
import java.util.List;

import org.apache.commons.lang3.StringUtils;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.mail.MailSender;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.stereotype.Service;

import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;

/**
 * @Class Name : EgovDbMntrngScheduling.java
 * @Description : DB????????? ??????????
 * @Modification Information
 *
 *               ????????????
 *               ------- ------- -------------------
 *               2010.06.30 ????
 *               2022.11.11 ??? ????????
 *
 * @author ?
 * @since 2010.06.30
 * @version
 * @see
 *
 **/
@Service("egovDbMntrngScheduling")
public class EgovDbMntrngScheduling extends EgovAbstractServiceImpl {

	@Resource(name = "EgovDbMntrngService")
	private EgovDbMntrngService dbMntrngService;

	@Resource(name = "mntrngMailSender")
	private MailSender mntrngMailSender;

	@Resource(name = "mntrngMessage")
	private SimpleMailMessage mntrngMessage;

	/** ID Generation **/
	@Resource(name = "egovDbMntrngLogIdGnrService")
	private EgovIdGnrService idgenService;

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovDbMntrngScheduling.class);

	// ?? ??? ??? ?? ???
	private static final int RECORD_COUNT_PER_PAGE = 10000;

	@Autowired
	private ApplicationContext context;

	/**
	 * DB????????????.
	 *
	 * @param
	 * @return
	 * @throws Exception
	 **/
	public void monitorDb() throws Exception {
		// ?? ????? ?????~~
		List<DbMntrng> targetList = null;
		DbMntrng searchVO = new DbMntrng();
		// ?? ??????????
		searchVO.setPageIndex(1);
		searchVO.setFirstIndex(0);
		searchVO.setRecordCountPerPage(RECORD_COUNT_PER_PAGE);
		targetList = dbMntrngService.selectDbMntrngList(searchVO);
		LOGGER.debug("         ?   ?          {}", searchVO);
		LOGGER.debug("Result          ??: {}", targetList.size());
		// ???????? ?.
		Iterator<DbMntrng> iter = targetList.iterator();
		DbMntrng target = null;
		DbMntrngResult result = null;
		DbMntrngLog dbMntrngLog = null;
		String dmMntrngLogId = null;
		while (iter.hasNext()) {
			target = iter.next();
			LOGGER.debug("Data : {}", target);
			// ???????.
			result = DbMntrngChecker.check(context, target.getDataSourcNm(), target.getCeckSql());

			// ????????DB????????
			if (result.isNrmltAt()) {
				target.setMntrngSttus("01");
			} else {
				target.setMntrngSttus("02");
			}
			target.setLastUpdusrId("SYSTEM");
			dbMntrngService.updateDbMntrng(target);
			// ????????????
			dbMntrngLog = new DbMntrngLog();
			dmMntrngLogId = idgenService.getNextStringId();
			dbMntrngLog.setLogId(dmMntrngLogId);
			dbMntrngLog.setDataSourcNm(target.getDataSourcNm());
			dbMntrngLog.setServerNm(target.getServerNm());
			dbMntrngLog.setDbmsKind(target.getDbmsKind());
			dbMntrngLog.setCeckSql(target.getCeckSql());
			dbMntrngLog.setMngrNm(target.getMngrNm());
			dbMntrngLog.setMngrEmailAddr(target.getMngrEmailAddr());
			dbMntrngLog.setMntrngSttus(target.getMntrngSttus());
			dbMntrngLog.setFrstRegisterId("SYSTEM");
			dbMntrngLog.setLastUpdusrId("SYSTEM");
			if (result.getCause() != null) {
				LOGGER.debug("?   ?            ?      ?: {}", result.getCause().getMessage());

				if (result.getCause().getMessage() != null) {
					dbMntrngLog.setLogInfo(result.getCause().getMessage());
				} else {
					dbMntrngLog.setLogInfo("");
				}

			} else {
				dbMntrngLog.setLogInfo("");
			}
			dbMntrngService.insertDbMntrngLog(dbMntrngLog);

			// ?????????????????
			dbMntrngLog = dbMntrngService.selectDbMntrngLog(dbMntrngLog);
			LOGGER.debug("DB??      ??         ?Data : {}", dbMntrngLog);
			// email ?.
			if (!result.isNrmltAt()) {
				sendEmail(dbMntrngLog);
			}
		}

	}

	/**
	 * ???? ???.
	 *
	 * @param mntrngLog ?? ????
	 * @return
	 *
	 **/
	private void sendEmail(DbMntrngLog mntrngLog) {
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
			subject = EgovStringUtil.replace(subject, "{         ??         ?         ?", "DB??      ??      ??         ?);"); // force closed
			msg.setSubject(subject);
		}
		// ???
		text = msg.getText();
		// 2022.11.11 ????????
		if (StringUtils.isNotEmpty(text)) {
			text = EgovStringUtil.replace(text, "{         ??         ?         ?", "DB??      ??      ??         ?);"); // force closed
			errorContents = "?         ?????      ?: " + mntrngLog.getDataSourcNm() + "\n";
			errorContents = errorContents + "??         ? : " + mntrngLog.getServerNm() + "\n";
			errorContents = errorContents + "DBMS?         ?: " + mntrngLog.getDbmsKindNm() + "\n";
			errorContents = errorContents + "               QL : " + mntrngLog.getCeckSql() + "\n";
			errorContents = errorContents + "?          : " + mntrngLog.getMntrngSttusNm() + "\n";
			errorContents = errorContents + "         ??         ??       : " + mntrngLog.getCreatDt() + "\n";
			errorContents = errorContents + "?   ?            ?      ? : " + mntrngLog.getLogInfo() + "\n";
			text = EgovStringUtil.replace(text, "{?   ?   ??      }", errorContents);
			msg.setText(text);
		}

		this.mntrngMailSender.send(msg);
	}

}
