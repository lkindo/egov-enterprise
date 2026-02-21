package egovframework.com.utl.sys.nsm.service;

import java.util.Iterator;
import java.util.List;
import java.util.Map;

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
 * <pre>
 * ??
 * - ????????????? ?????????? ???.
 *
 * ???
 * - ?????????? ???????.
 * - ?????????? ?????? ???? ???.
 * </pre>
 * 
 * @author ???
 * @version 1.0
 * @created 28-6-2010 ?? 11:33:43
 * 
 *          <pre>
 * << ?????Modification Information) >>
 *
 *  ????      ????    ????
 *  ----------   --------   ---------------------------

 *          </pre>
 **/
/**
 * <pre>
 * ??
 * - ????????????? ?????????? ???.
 *
 * ???
 * - ?????????? ???????.
 * - ?????????? ?????? ???? ???.
 * </pre>
 * 
 * @author ???
 * @since 2010.06.28
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2010.06.28  ???         ????
 *   2022.11.11  ???          ????????
 *   2025.09.15  ????         2025????????PMD???????? ????????-UnnecessaryBoxing(???WrapperObject ??)
 *
 *      </pre>
 **/
@Service("egovNtwrkSvcMntrngScheduling")
public class EgovNtwrkSvcMntrngScheduling extends EgovAbstractServiceImpl {

	@Resource(name = "EgovNtwrkSvcMntrngService")
	private EgovNtwrkSvcMntrngService ntwrkSvcMntrngService;

	@Resource(name = "mntrngMailSender")
	private MailSender mntrngMailSender;

	@Resource(name = "mntrngMessage")
	private SimpleMailMessage mntrngMessage;

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovNtwrkSvcMntrngScheduling.class);

	// ?? ??? ??? ?? ???
	private static final int RECORD_COUNT_PER_PAGE = 10000;

	/**
	 * ???? ????????????.
	 *
	 * @param
	 * @return
	 * @throws Exception
	 **/
	@SuppressWarnings("unchecked")
	public void monitorNtwrkSvc() throws Exception {
		// ?? ????? ?????
		Map<String, Object> map = null;
		List<NtwrkSvcMntrng> targetList = null;
		NtwrkSvcMntrngVO searchVO = new NtwrkSvcMntrngVO();
		// ?? ??????????
		searchVO.setPageIndex(1);
		searchVO.setFirstIndex(0);
		searchVO.setRecordCountPerPage(RECORD_COUNT_PER_PAGE);
		map = ntwrkSvcMntrngService.selectNtwrkSvcMntrngList(searchVO);
		targetList = (List<NtwrkSvcMntrng>) map.get("resultList");
		LOGGER.debug("         ?   ?          {}", searchVO);
		LOGGER.debug("Result          ??: {}", targetList.size());
		// ???????? ?.
		Iterator<NtwrkSvcMntrng> iter = targetList.iterator();
		NtwrkSvcMntrng target = null;
		NtwrkSvcMntrngResult result = null;
		while (iter.hasNext()) {
			target = iter.next();
			LOGGER.debug("Data : {}", target);
			// ???????.
			java.text.SimpleDateFormat formatter = new java.text.SimpleDateFormat("yyyyMMddHHmmss", java.util.Locale.KOREA);
			target.setCreatDt(formatter.format(new java.util.Date()));
			result = NtwrkSvcMntrngChecker.check(target.getSysIp(), Integer.parseInt(target.getSysPort()));

			// email ?.
			if (!result.isNrmltAt()) {
// 				target.setMntrngSttus("?????);
				sendEmail(target);
			}

			// DB????????
			if (result.isNrmltAt()) {
				target.setMntrngSttus("01");
			} else {
				target.setMntrngSttus("02");
			}

			// DB???? ????
			if (result.getCause() != null) {
				target.setLogInfo(result.getCause().getMessage());
			} else {
				target.setLogInfo("");
			}
			target.setLastUpdusrId("SYSTEM");
			ntwrkSvcMntrngService.updateNtwrkSvcMntrngSttus(target);

		}

	}

	/**
	 * ???? ???.
	 *
	 * @param target ?? ????
	 * @return
	 *
	 **/
	private void sendEmail(NtwrkSvcMntrng target) {
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
			subject = EgovStringUtil.replace(subject, "{         ??         ?         ?", "??      ??      ??      ??      ??         ?);");
			msg.setSubject(subject);
		}
		// ???
		text = msg.getText();
		// 2022.11.11 ????????
		if (StringUtils.isNotEmpty(text)) {
			text = EgovStringUtil.replace(text, "{         ??         ?         ?", "??      ??      ??      ??      ??         ?);");
			errorContents = "??         ?: ";
			errorContents += target.getSysNm();
			errorContents += "\n";
			errorContents += "??      IP : ";
			errorContents += target.getSysIp();
			errorContents += "\n";
			errorContents += "??      ????: ";
			errorContents += target.getSysPort();
			errorContents += "\n";
			errorContents += "?          : ";
			errorContents += target.getMntrngSttus();
			errorContents += "\n";
			errorContents += "         ??          ??       : ";
			errorContents += EgovDateUtil.convertDate(target.getCreatDt(), "", "", "");
			errorContents += "\n";
			errorContents += target.getSysNm() + " ????      ??       ??      ???                  ??   ??         ??      . \n         ?      ??         ??      ?         .";
			text = EgovStringUtil.replace(text, "{?   ?   ??      }", errorContents);
			msg.setText(text);
		}

		this.mntrngMailSender.send(msg);
	}

}
