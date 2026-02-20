package egovframework.com.utl.sys.dbm.service;

import java.util.Iterator;
import java.util.List;

import org.apache.commons.lang.StringUtils;
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
 * @Description : DB?쒕퉬?ㅻえ?덊꽣留곸쓣 ?꾪븳 ?ㅼ?伊대쭅 ?대옒??
 * @Modification Information
 *
 *    ?섏젙??      ?섏젙??        ?섏젙?댁슜
 *    -------        -------     -------------------
 *    2010.06.30     源吏꾨쭔   理쒖큹?앹꽦
 *    2022.11.11   	 源?쒖?   ?쒗걧?댁퐫??泥섎━
 *
 * @author  源吏꾨쭔
 * @since 2010.06.30
 * @version
 * @see
 *
 */
@Service("egovDbMntrngScheduling")
public class EgovDbMntrngScheduling extends EgovAbstractServiceImpl {

	@Resource(name = "egovDbMntrngService")
	private EgovDbMntrngService dbMntrngService;

	@Resource(name = "mntrngMailSender")
	private MailSender mntrngMailSender;

	@Resource(name = "mntrngMessage")
	private SimpleMailMessage mntrngMessage;

	/** ID Generation */
	@Resource(name = "egovDbMntrngLogIdGnrService")
	private EgovIdGnrService idgenService;

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovDbMntrngScheduling.class);

	// 紐⑤땲?곕쭅 ??곸쓣 ?쎄린?꾪븳 ?섏씠吏 ?ш린
	private static final int RECORD_COUNT_PER_PAGE = 10000;

	@Autowired
	private ApplicationContext context;

	/**
	 * DB?쒕퉬??紐⑤땲?곕쭅瑜??섑뻾?쒕떎.
	 *
	 * @param
	 * @return
	 * @throws Exception
	 */
	public void monitorDb() throws Exception {
		// 紐⑤땲?곕쭅 ????뺣낫 ?쎌뼱?ㅼ씠湲?~~
		List<DbMntrng> targetList = null;
		DbMntrng searchVO = new DbMntrng();
		// 紐⑤땲?곕쭅 ???寃??議곌굔 珥덇린??
		searchVO.setPageIndex(1);
		searchVO.setFirstIndex(0);
		searchVO.setRecordCountPerPage(RECORD_COUNT_PER_PAGE);
		targetList = dbMntrngService.selectDbMntrngList(searchVO);
		LOGGER.debug("議고쉶議곌굔 {}", searchVO);
		LOGGER.debug("Result 嫄댁닔 : {}", targetList.size());
		// ?쒕퉬?ㅼ껜???⑥닔 ?몄텧.
		Iterator<DbMntrng> iter = targetList.iterator();
		DbMntrng target = null;
		DbMntrngResult result = null;
		DbMntrngLog dbMntrngLog = null;
		String dmMntrngLogId = null;
		while (iter.hasNext()) {
			target = iter.next();
			LOGGER.debug("Data : {}", target);
			// ?쒕퉬??泥댄겕 ?섑뻾.
			result = DbMntrngChecker.check(context, target.getDataSourcNm(), target.getCeckSql());

			// ??곹뀒?대툝??DB??寃곌낵媛????
			if (result.isNrmltAt()) {
				target.setMntrngSttus("01");
			} else {
				target.setMntrngSttus("02");
			}
			target.setLastUpdusrId("SYSTEM");
			dbMntrngService.updateDbMntrng(target);
			// 濡쒓렇?뚯씠釉?異붽????
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
				LOGGER.debug("?먮윭硫붿떆吏: {}", result.getCause().getMessage());

				if (result.getCause().getMessage() != null) {
					dbMntrngLog.setLogInfo(result.getCause().getMessage());
				} else {
					dbMntrngLog.setLogInfo("");
				}

			} else {
				dbMntrngLog.setLogInfo("");
			}
			dbMntrngService.insertDbMntrngLog(dbMntrngLog);

			// 紐⑤땲?곕쭅?쒓컖??媛?몄삤湲곗쐞??濡쒓렇?뺣낫瑜?媛?몄삩??
			dbMntrngLog = dbMntrngService.selectDbMntrngLog(dbMntrngLog);
			LOGGER.debug("DB?쒕퉬?ㅻ줈洹?Data : {}", dbMntrngLog);
			// email ?꾩넚.
			if (!result.isNrmltAt()) {
				sendEmail(dbMntrngLog);
			}
		}

	}

	/**
	 * ?대찓?쇱쓣 ?꾩넚?쒕떎.
	 *
	 * @param   mntrngLog   紐⑤땲?곕쭅 ??곸젙蹂?
	 * @return
	 *
	 */
	private void sendEmail(DbMntrngLog mntrngLog) {
		String subject = "";
		String text = "";
		String errorContents = "";

		SimpleMailMessage msg = new SimpleMailMessage(this.mntrngMessage);
		// ?섏떊??
		msg.setTo(mntrngLog.getMngrEmailAddr());
		// 硫붿씪?쒕ぉ
		subject = msg.getSubject();
		// 2022.11.11 ?쒗걧?댁퐫??泥섎━
		if (StringUtils.isNotEmpty(subject)) {
			subject = EgovStringUtil.replace(subject, "{紐⑤땲?곕쭅醫낅쪟}", "DB?쒕퉬?ㅻえ?덊꽣留?);
			msg.setSubject(subject);
		}
		// 硫붿씪?댁슜
		text = msg.getText();
		// 2022.11.11 ?쒗걧?댁퐫??泥섎━
		if (StringUtils.isNotEmpty(text)) {
			text = EgovStringUtil.replace(text, "{紐⑤땲?곕쭅醫낅쪟}", "DB?쒕퉬?ㅻえ?덊꽣留?);
			errorContents = "?곗씠??뚯뒪紐?: " + mntrngLog.getDataSourcNm() + "\n";
			errorContents = errorContents + "?쒕쾭紐? : " + mntrngLog.getServerNm() + "\n";
			errorContents = errorContents + "DBMS醫낅쪟 : " + mntrngLog.getDbmsKindNm() + "\n";
			errorContents = errorContents + "泥댄겕SQL : " + mntrngLog.getCeckSql() + "\n";
			errorContents = errorContents + "?곹깭 : " + mntrngLog.getMntrngSttusNm() + "\n";
			errorContents = errorContents + "紐⑤땲?곕쭅?쒓컖 : " + mntrngLog.getCreatDt() + "\n";
			errorContents = errorContents + "?먮윭硫붿떆吏 : " + mntrngLog.getLogInfo() + "\n";
			text = EgovStringUtil.replace(text, "{?먮윭?댁슜}", errorContents);
			msg.setText(text);
		}

		this.mntrngMailSender.send(msg);
	}

}
