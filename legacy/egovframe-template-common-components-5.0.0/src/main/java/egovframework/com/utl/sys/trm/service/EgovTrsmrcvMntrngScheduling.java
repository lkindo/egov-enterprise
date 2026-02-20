package egovframework.com.utl.sys.trm.service;

import java.util.Iterator;
import java.util.List;

import org.apache.commons.lang.StringUtils;
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
 * @Description : ?≪닔?좊え?덊꽣留곸쓣 ?꾪븳 ?ㅼ?伊대쭅 ?대옒??
 * @Modification Information
 *
 *    ?섏젙??      ?섏젙??        ?섏젙?댁슜
 *    -------        -------     -------------------
 *    2010.08.16     源吏꾨쭔   理쒖큹?앹꽦
 *    2022.11.11   	 源?쒖?   ?쒗걧?댁퐫??泥섎━
 *
 * @author  源吏꾨쭔
 * @version
 * @see
 *
 */
@Service("egovTrsmrcvMntrngScheduling")
public class EgovTrsmrcvMntrngScheduling extends EgovAbstractServiceImpl {

	@Resource(name = "egovTrsmrcvMntrngService")
	private EgovTrsmrcvMntrngService trsmrcvMntrngService;

	@Resource(name = "mntrngMailSender")
	private MailSender mntrngMailSender;

	@Resource(name = "mntrngMessage")
	private SimpleMailMessage mntrngMessage;

	/** ID Generation */
	@Resource(name = "egovTrsmrcvMntrngLogIdGnrService")
	private EgovIdGnrService idgenService;

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovTrsmrcvMntrngScheduling.class);

	// 紐⑤땲?곕쭅 ??곸쓣 ?쎄린?꾪븳 ?섏씠吏 ?ш린
	private static final int RECORD_COUNT_PER_PAGE = 10000;

	/**
	 * ?≪닔??紐⑤땲?곕쭅瑜??섑뻾?쒕떎.
	 *
	 * @param
	 * @return
	 * @throws Exception
	 */
	public void monitor() throws Exception {
		// 紐⑤땲?곕쭅 ????뺣낫 ?쎌뼱?ㅼ씠湲?~~
		List<TrsmrcvMntrng> targetList = null;
		TrsmrcvMntrng searchVO = new TrsmrcvMntrng();
		// 紐⑤땲?곕쭅 ???寃??議곌굔 珥덇린??
		searchVO.setPageIndex(1);
		searchVO.setFirstIndex(0);
		searchVO.setRecordCountPerPage(RECORD_COUNT_PER_PAGE);
		targetList = trsmrcvMntrngService.selectTrsmrcvMntrngList(searchVO);
		LOGGER.debug("議고쉶議곌굔 {}", searchVO);
		LOGGER.debug("Result 嫄댁닔 : {}", targetList.size());
		// ?쒕퉬?ㅼ껜???⑥닔 ?몄텧.
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
				// Checker ?대옒???앹꽦.
				klass = Class.forName(target.getTestClassNm());
				checker = (TrsmrcvMntrngChecker)klass.newInstance();
				LOGGER.debug("Just made: {}", checker);
				// ?쒕퉬??泥댄겕 ?섑뻾.
				result = checker.check(target.getCntcId());
				LOGGER.debug("Result Data: {}", checker);
			} catch (ClassNotFoundException e) {
				LOGGER.error("?≪닔?좊え?덊꽣留?Checker?대옒???앹꽦?먮윭", e);
				result = new TrsmrcvMntrngResult(false, e);
			} catch (IllegalAccessException e) {
				LOGGER.error("?≪닔?좊え?덊꽣留?Checker?대옒???앹꽦?먮윭", e);
				result = new TrsmrcvMntrngResult(false, e);
			} catch (InstantiationException e) {
				LOGGER.error("?≪닔?좊え?덊꽣留?Checker?대옒???앹꽦?먮윭", e);
				result = new TrsmrcvMntrngResult(false, e);
			}

			// ??곹뀒?대툝??DB??寃곌낵媛????

			if (result != null && result.isNrmltAt()) {
				target.setMntrngSttus("01");
			} else {
				target.setMntrngSttus("02");
			}
			target.setLastUpdusrId("SYSTEM");
			trsmrcvMntrngService.updateTrsmrcvMntrng(target);
			// 濡쒓렇?뚯씠釉?異붽????
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
				LOGGER.debug("?먮윭硫붿떆吏: {}", result.getCause().getMessage());

				if (result.getCause().getMessage() != null) {
					trsmrcvMntrngLog
						.setLogInfo(result.getCause().getClass().getName() + " - " + result.getCause().getMessage());
				} else {
					trsmrcvMntrngLog.setLogInfo("");
				}

			} else {
				trsmrcvMntrngLog.setLogInfo("");
			}
			LOGGER.debug("insert???≪닔?좊え?덊꽣留곷줈洹?Data : {}", trsmrcvMntrngLog);
			trsmrcvMntrngService.insertTrsmrcvMntrngLog(trsmrcvMntrngLog);

			// 紐⑤땲?곕쭅?쒓컖??媛?몄삤湲곗쐞??濡쒓렇?뺣낫瑜?媛?몄삩??
			trsmrcvMntrngLog = trsmrcvMntrngService.selectTrsmrcvMntrngLog(trsmrcvMntrngLog);
			LOGGER.debug(" email?꾩넚???≪닔?좊え?덊꽣留곷줈洹?Data : {}", trsmrcvMntrngLog);

			// email ?꾩넚.
			if (result != null && !result.isNrmltAt()) { //2022.01. Possible null pointer dereference
				sendEmail(trsmrcvMntrngLog);
			}

		} /* end of while */

	}

	/**
	 * ?대찓?쇱쓣 ?꾩넚?쒕떎.
	 *
	 * @param   mntrngLog   紐⑤땲?곕쭅 ??곸젙蹂?
	 * @return
	 *
	 */
	private void sendEmail(TrsmrcvMntrngLog mntrngLog) {
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
			subject = EgovStringUtil.replace(subject, "{紐⑤땲?곕쭅醫낅쪟}", "?≪닔?좊え?덊꽣留?);
			msg.setSubject(subject);
		}
		// 硫붿씪?댁슜
		text = msg.getText();
		// 2022.11.11 ?쒗걧?댁퐫??泥섎━
		if (StringUtils.isNotEmpty(text)) {
			text = EgovStringUtil.replace(text, "{紐⑤땲?곕쭅醫낅쪟}", "?≪닔?좊え?덊꽣留?);
			errorContents = "?곌퀎ID : " + mntrngLog.getCntcId() + "\n";
			errorContents = errorContents + "?곌퀎紐?: " + mntrngLog.getCntcNm() + "\n";
			errorContents = errorContents + "?뚯뒪?명겢?섏뒪紐?: " + mntrngLog.getTestClassNm() + "\n";
			errorContents = errorContents + "?곹깭 : " + mntrngLog.getMntrngSttusNm() + "\n";
			errorContents = errorContents + "紐⑤땲?곕쭅?쒓컖 : " + mntrngLog.getCreatDt() + "\n";
			errorContents = errorContents + "?먮윭硫붿떆吏 : " + mntrngLog.getLogInfo() + "\n";
			text = EgovStringUtil.replace(text, "{?먮윭?댁슜}", errorContents);
			msg.setText(text);
		}

		this.mntrngMailSender.send(msg);
	}

}
