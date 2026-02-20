package egovframework.com.utl.sys.prm.service;

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
 * ??
 * - ?? ????? ??????????? ???.
 * @author ??
 * @version 1.0
 * @created 08-9-2010 ?? 3:54:45
 *
 * <pre>
 * << ?????Modification Information) >>
 *
 *  ????              ????           ????
 *  ----------   --------   ---------------------------
 *  2019.12.06   ???            KISA ?? ??(????????
 *  2022.11.11   ???             ????????
 *
 * </pre>
 **/

@Service("egovProcessMonScheduling")
public class EgovProcessMonScheduling extends EgovAbstractServiceImpl {

	@Resource(name = "EgovProcessMonService")
	private EgovProcessMonService egovProcessMonService;

	@Resource(name = "mntrngMailSender")
	private MailSender mntrngMailSender;

	@Resource(name = "mntrngMessage")
	private SimpleMailMessage mntrngMessage;

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovProcessMonScheduling.class);

	// ?? ??? ??? ?? ???
	private static final int RECORD_COUNT_PER_PAGE = 10000;

	/**
	 * ?? ????????.
	 * @param
	 * @return
	 **/
	public void monitorProcess() throws Exception {

		// ?? ????? ?????
		List<ProcessMonVO> targetList = null;
		ProcessMonVO searchVO = new ProcessMonVO();

		// ?? ??????????
		searchVO.setPageIndex(1);
		searchVO.setFirstIndex(0);
		searchVO.setRecordCountPerPage(RECORD_COUNT_PER_PAGE);
		targetList = egovProcessMonService.selectProcessMonList(searchVO);

		LOGGER.debug("         ?   ?          {}", searchVO);
		LOGGER.debug("Result          ??: {}", targetList.size());

		// ???????? ?.
		Iterator<ProcessMonVO> iter = targetList.iterator();
		ProcessMon target = null;
		String procsSttus = null;
		String processNm = "";

		boolean nrmltAt = true;

		while (iter.hasNext()) {

			nrmltAt = true;
			target = iter.next();
			LOGGER.debug("Data : {}", target);

			// ???????.
			java.text.SimpleDateFormat formatter = new java.text.SimpleDateFormat("yyyyMMddHHmmss", java.util.Locale.KOREA);
			target.setCreatDt(formatter.format(new java.util.Date()));

			processNm = target.getProcessNm();

			try {

				procsSttus = ProcessMonChecker.getProcessId(processNm);
				target.setProcsSttus(procsSttus);

			} catch (IOException e1) {
				target.setLogInfo(e1.getMessage());
				nrmltAt = false;
			}

			if (procsSttus == "02") {
				nrmltAt = false;
			}

			// email ?.
			if (!nrmltAt) {
// 				target.setProcsSttus("?????);
				sendEmail(target);
			}

			// DB????????
			target.setProcsSttus(procsSttus);
			if (procsSttus == "02") {
				target.setLogInfo("??               ???             ?        ?                      ????      ??       ?         ????      ??      .");
			}

			target.setLastUpdusrId("SYSTEM");
			egovProcessMonService.updateProcessMonSttus(target);
		}
	}

	/**
	 * ???? ???.
	 * @return
	 *
	 * @param target
	 **/
	private void sendEmail(ProcessMon target) {
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
			subject = EgovStringUtil.replace(subject, "{         ??         ?         ?", "?         ?                  ??         ");
			msg.setSubject(subject);
		}
		// ???
		text = msg.getText();
		// 2022.11.11 ????????
		if (StringUtils.isNotEmpty(text)) {
			text = EgovStringUtil.replace(text, "{         ??         ?         ?", "?         ?                  ??         ");
			errorContents = "?         ?            ?: ";
			errorContents += target.getProcessNm();
			errorContents += "\n";
			errorContents += "?          : ";
			errorContents += target.getProcsSttus();
			errorContents += "\n";
			errorContents += "         ??          ??       : ";
			errorContents += EgovDateUtil.convertDate(target.getCreatDt(), "", "", "");
			errorContents += "\n";
			if (target.getLogInfo() != null && !target.getLogInfo().equals("")) {
				errorContents += target.getProcessNm() + " ???         ?          ?                  ??   ??         ??      .  \n         ?      ??         ??      ?         .";
			}
			text = EgovStringUtil.replace(text, "{?   ?   ??      }", errorContents);
			msg.setText(text);
		}

		this.mntrngMailSender.send(msg);
	}

}
