package egovframework.com.utl.sys.htm.service;

import java.io.IOException;
import java.util.Iterator;
import java.util.List;

import org.apache.commons.lang3.StringUtils;
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
 * @Description : HTTP????????? ??????????
 * @Modification Information
 *
 *               ???????????? ---------- ------- ------------------- 2010.09.01
 *               ????? 2019.12.06 ???KISA ?? ??(???????? 2022.11.11 ???
 *               ????????
 *
 * @author ??
 * @since 2010.05.01
 * @version
 * @see
 *
 **/

@Service("httpMntrngScheduling")
public class HttpMntrngScheduling extends EgovAbstractServiceImpl {

	@Resource(name = "EgovHttpMonService")
	private EgovHttpMonService egovHttpMonService;

	@Resource(name = "mntrngMailSender")
	private MailSender mntrngMailSender;

	@Resource(name = "mntrngMessage")
	private SimpleMailMessage mntrngMessage;

	private static final Logger LOGGER = LoggerFactory.getLogger(HttpMntrngScheduling.class);

	// ?? ??? ??? ?? ???
	private static final int RECORD_COUNT_PER_PAGE = 10000;

	/**
	 * HTTP????????????.
	 *
	 * @param
	 * @return
	 * @throws Exception
	 **/
	public void monitorHttp() throws Exception {

		// ?? ????? ?????
		List<HttpMonVO> targetList = null;
		HttpMonVO searchVO = new HttpMonVO();

		// ?? ??????????
		searchVO.setPageIndex(1);
		searchVO.setFirstIndex(0);
		searchVO.setRecordCountPerPage(RECORD_COUNT_PER_PAGE);
		targetList = egovHttpMonService.selectHttpMonList(searchVO);

		LOGGER.debug("         ?   ?          {}", searchVO);
		LOGGER.debug("Result          ??: {}", targetList.size());

		// ???????? ?.
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

			// ???????.
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

			// email ?.
			if (!nrmltAt) {
// 				target.setHttpSttusCd("?????);
				sendEmail(target);
			}

			// DB????????
			target.setHttpSttusCd(httpSttusCd);
			if (httpSttusCd == "02") {
				target.setLogInfo("Connection timed out: connect");
			}

			target.setLastUpdusrId("SYSTEM");
			egovHttpMonService.updateHttpMonSttus(target);
		}
	}

	/**
	 * ???? ???.
	 *
	 * @return
	 *
	 * @param target
	 **/
	private void sendEmail(HttpMon target) {
		String subject = "";
		String text = "";
		String errorContents = "";

		SimpleMailMessage msg = new SimpleMailMessage(this.mntrngMessage);
		// ????
		msg.setTo(target.getMngrEmailAddr());
		// ???
		subject = msg.getSubject();
		// 2022.11.11 ????????
		if (StringUtils.isNotEmpty(subject)) {
			subject = EgovStringUtil.replace(subject, "{         ??         ?         ?", "HTTP??      ??         ??         ");
			msg.setSubject(subject);
		}
		// ???
		text = msg.getText();
		// 2022.11.11 ????????
		if (StringUtils.isNotEmpty(text)) {
			text = EgovStringUtil.replace(text, "{         ??         ?         ?", "HTTP??      ??         ??         ");
			errorContents = "?                       ?         ?: ";
			errorContents += target.getWebKind();
			errorContents += "\n";
			errorContents += "??      ??   L : ";
			errorContents += target.getSiteUrl();
			errorContents += "\n";
			errorContents += "?          : ";
			errorContents += target.getHttpSttusCd();
			errorContents += "\n";
			errorContents += "         ??          ??       : ";
			errorContents += EgovDateUtil.convertDate(target.getCreatDt(), "", "", "");
			errorContents += "\n";
			if (target.getLogInfo() != null && !target.getLogInfo().equals("")) {
				errorContents += target.getWebKind() + " ???         ?          ?                  ??   ??         ??      .  \n         ?      ??         ??      ?         .";
			}
			text = EgovStringUtil.replace(text, "{?   ?   ??      }", errorContents);
			msg.setText(text);
		}

		this.mntrngMailSender.send(msg);
	}

}
