package egovframework.com.utl.sys.htm.service;

import java.io.IOException;
import java.util.Iterator;
import java.util.List;

import org.apache.commons.lang.StringUtils;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailSender;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.stereotype.Service;

import egovframework.com.utl.fcc.service.EgovDateUtil;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;

/**
 * @Class Name : HttpMntrngScheduling.java
 * @Description : HTTP?쒕퉬?ㅻえ?덊꽣留곸쓣 ?꾪븳 ?ㅼ?伊대쭅 ?대옒??
 * @Modification Information
 *
 *               ?섏젙???섏젙???섏젙?댁슜 ---------- ------- ------------------- 2010.09.01
 *               諛뺤쥌??理쒖큹?앹꽦 2019.12.06 ?좎슜??KISA 蹂댁븞?쎌젏 議곗튂 (遺?곸젅???덉쇅泥섎━) 2022.11.11 源?쒖?
 *               ?쒗걧?댁퐫??泥섎━
 *
 * @author 諛뺤쥌??
 * @since 2010.05.01
 * @version
 * @see
 *
 */

@Service("httpMntrngScheduling")
public class HttpMntrngScheduling extends EgovAbstractServiceImpl {

	@Resource(name = "EgovHttpMonService")
	private EgovHttpMonService egovHttpMonService;

	@Resource(name = "mntrngMailSender")
	private MailSender mntrngMailSender;

	@Resource(name = "mntrngMessage")
	private SimpleMailMessage mntrngMessage;

	private static final Logger LOGGER = LoggerFactory.getLogger(HttpMntrngScheduling.class);

	// 紐⑤땲?곕쭅 ??곸쓣 ?쎄린?꾪븳 ?섏씠吏 ?ш린
	private static final int RECORD_COUNT_PER_PAGE = 10000;

	/**
	 * HTTP?쒕퉬??紐⑤땲?곕쭅瑜??섑뻾?쒕떎.
	 *
	 * @param
	 * @return
	 * @throws Exception
	 */
	public void monitorHttp() throws Exception {

		// 紐⑤땲?곕쭅 ????뺣낫 ?쎌뼱?ㅼ씠湲?
		List<HttpMonVO> targetList = null;
		HttpMonVO searchVO = new HttpMonVO();

		// 紐⑤땲?곕쭅 ???寃??議곌굔 珥덇린??
		searchVO.setPageIndex(1);
		searchVO.setFirstIndex(0);
		searchVO.setRecordCountPerPage(RECORD_COUNT_PER_PAGE);
		targetList = egovHttpMonService.selectHttpMonList(searchVO);

		LOGGER.debug("議고쉶議곌굔 {}", searchVO);
		LOGGER.debug("Result 嫄댁닔 : {}", targetList.size());

		// ?쒕퉬?ㅼ껜???⑥닔 ?몄텧.
		Iterator<HttpMonVO> iter = targetList.iterator();
		HttpMon target = null;

		String webKind = null;
		String httpSttusCd = null;
		String sysId = null;
		String siteUrl = null;

		boolean nrmltAt = true;

		while (iter.hasNext()) {

			nrmltAt = true;
			target = iter.next();
			siteUrl = target.getSiteUrl();
			LOGGER.debug("Data : {}", target);

			// ?쒕퉬??泥댄겕 ?섑뻾.
			java.text.SimpleDateFormat formatter = new java.text.SimpleDateFormat("yyyyMMddHHmmss",
					java.util.Locale.KOREA);
			target.setCreatDt(formatter.format(new java.util.Date()));

			sysId = target.getSysId();
			webKind = target.getWebKind();
			LOGGER.debug("webKind : {}", webKind);
			LOGGER.debug("sysId : {}", sysId);

			try {
				httpSttusCd = HttpMntrngChecker.getPrductStatus(siteUrl);
				target.setHttpSttusCd(httpSttusCd);
			} catch (IOException e1) {
				target.setLogInfo(e1.getMessage());
				nrmltAt = false;
			}

			if (httpSttusCd == "02") {
				nrmltAt = false;
			}

			// email ?꾩넚.
			if (!nrmltAt) {
				target.setHttpSttusCd("鍮꾩젙??);
				sendEmail(target);
			}

			// DB??寃곌낵媛????
			target.setHttpSttusCd(httpSttusCd);
			if (httpSttusCd == "02") {
				target.setLogInfo("Connection timed out: connect");
			}

			target.setLastUpdusrId("SYSTEM");
			egovHttpMonService.updateHttpMonSttus(target);
		}
	}

	/**
	 * ?대찓?쇱쓣 ?꾩넚?쒕떎.
	 *
	 * @return
	 *
	 * @param target
	 */
	private void sendEmail(HttpMon target) {
		String subject = "";
		String text = "";
		String errorContents = "";

		SimpleMailMessage msg = new SimpleMailMessage(this.mntrngMessage);
		// ?섏떊??
		msg.setTo(target.getMngrEmailAddr());
		// 硫붿씪?쒕ぉ
		subject = msg.getSubject();
		// 2022.11.11 ?쒗걧?댁퐫??泥섎━
		if (StringUtils.isNotEmpty(subject)) {
			subject = EgovStringUtil.replace(subject, "{紐⑤땲?곕쭅醫낅쪟}", "HTTP?쒕퉬??紐⑤땲?곕쭅");
			msg.setSubject(subject);
		}
		// 硫붿씪?댁슜
		text = msg.getText();
		// 2022.11.11 ?쒗걧?댁퐫??泥섎━
		if (StringUtils.isNotEmpty(text)) {
			text = EgovStringUtil.replace(text, "{紐⑤땲?곕쭅醫낅쪟}", "HTTP?쒕퉬??紐⑤땲?곕쭅");
			errorContents = "?뱀꽌鍮꾩뒪醫낅쪟 : ";
			errorContents += target.getWebKind();
			errorContents += "\n";
			errorContents += "?쒖뒪?쏹RL : ";
			errorContents += target.getSiteUrl();
			errorContents += "\n";
			errorContents += "?곹깭 : ";
			errorContents += target.getHttpSttusCd();
			errorContents += "\n";
			errorContents += "紐⑦떚?곕쭅 ?쒓컖 : ";
			errorContents += EgovDateUtil.convertDate(target.getCreatDt(), "", "", "");
			errorContents += "\n";
			if (target.getLogInfo() != null && !target.getLogInfo().equals("")) {
				errorContents += target.getWebKind() + " ???꾨줈?몄뒪 ?곹깭媛 鍮꾩젙?곸엯?덈떎.  \n濡쒓렇瑜??뺤씤?댁＜?몄슂.";
			}
			text = EgovStringUtil.replace(text, "{?먮윭?댁슜}", errorContents);
			msg.setText(text);
		}

		this.mntrngMailSender.send(msg);
	}

}
