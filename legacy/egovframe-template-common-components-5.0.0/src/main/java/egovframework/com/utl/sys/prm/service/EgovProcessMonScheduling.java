package egovframework.com.utl.sys.prm.service;

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
 * 媛쒖슂
 * - ?꾨줈?몄뒪 紐⑤땲?곕쭅???꾪븳 ?ㅼ?伊대쭅 ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * @author 諛뺤쥌??
 * @version 1.0
 * @created 08-9-2010 ?ㅽ썑 3:54:45
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *  ?섏젙??              ?섏젙??           ?섏젙?댁슜
 *  ----------   --------   ---------------------------
 *  2019.12.06   ?좎슜??            KISA 蹂댁븞?쎌젏 議곗튂 (遺?곸젅???덉쇅泥섎━)
 *  2022.11.11   源?쒖?             ?쒗걧?댁퐫??泥섎━
 *
 * </pre>
 */

@Service("egovProcessMonScheduling")
public class EgovProcessMonScheduling extends EgovAbstractServiceImpl {

	@Resource(name = "EgovProcessMonService")
	private EgovProcessMonService egovProcessMonService;

	@Resource(name = "mntrngMailSender")
	private MailSender mntrngMailSender;

	@Resource(name = "mntrngMessage")
	private SimpleMailMessage mntrngMessage;

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovProcessMonScheduling.class);

	// 紐⑤땲?곕쭅 ??곸쓣 ?쎄린?꾪븳 ?섏씠吏 ?ш린
	private static final int RECORD_COUNT_PER_PAGE = 10000;

	/**
	 * ?꾨줈?몄뒪 紐⑤땲?곕쭅瑜??섑뻾?쒕떎.
	 * @param
	 * @return
	 */
	public void monitorProcess() throws Exception {

		// 紐⑤땲?곕쭅 ????뺣낫 ?쎌뼱?ㅼ씠湲?
		List<ProcessMonVO> targetList = null;
		ProcessMonVO searchVO = new ProcessMonVO();

		// 紐⑤땲?곕쭅 ???寃??議곌굔 珥덇린??
		searchVO.setPageIndex(1);
		searchVO.setFirstIndex(0);
		searchVO.setRecordCountPerPage(RECORD_COUNT_PER_PAGE);
		targetList = egovProcessMonService.selectProcessMonList(searchVO);

		LOGGER.debug("議고쉶議곌굔 {}", searchVO);
		LOGGER.debug("Result 嫄댁닔 : {}", targetList.size());

		// ?쒕퉬?ㅼ껜???⑥닔 ?몄텧.
		Iterator<ProcessMonVO> iter = targetList.iterator();
		ProcessMon target = null;
		String procsSttus = null;
		String processNm = "";

		boolean nrmltAt = true;

		while (iter.hasNext()) {

			nrmltAt = true;
			target = iter.next();
			LOGGER.debug("Data : {}", target);

			// ?쒕퉬??泥댄겕 ?섑뻾.
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

			// email ?꾩넚.
			if (!nrmltAt) {
				target.setProcsSttus("鍮꾩젙??);
				sendEmail(target);
			}

			// DB??寃곌낵媛????
			target.setProcsSttus(procsSttus);
			if (procsSttus == "02") {
				target.setLogInfo("?ㅽ뻾 以묒씤 ?묒뾽 以?吏?뺣맂 議곌굔???쇱튂?섎뒗 ?묒뾽???놁뒿?덈떎.");
			}

			target.setLastUpdusrId("SYSTEM");
			egovProcessMonService.updateProcessMonSttus(target);
		}
	}

	/**
	 * ?대찓?쇱쓣 ?꾩넚?쒕떎.
	 * @return
	 *
	 * @param target
	 */
	private void sendEmail(ProcessMon target) {
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
			subject = EgovStringUtil.replace(subject, "{紐⑤땲?곕쭅醫낅쪟}", "?꾨줈?몄뒪紐⑤땲?곕쭅");
			msg.setSubject(subject);
		}
		// 硫붿씪?댁슜
		text = msg.getText();
		// 2022.11.11 ?쒗걧?댁퐫??泥섎━
		if (StringUtils.isNotEmpty(text)) {
			text = EgovStringUtil.replace(text, "{紐⑤땲?곕쭅醫낅쪟}", "?꾨줈?몄뒪紐⑤땲?곕쭅");
			errorContents = "?꾨줈?몄뒪紐?: ";
			errorContents += target.getProcessNm();
			errorContents += "\n";
			errorContents += "?곹깭 : ";
			errorContents += target.getProcsSttus();
			errorContents += "\n";
			errorContents += "紐⑦떚?곕쭅 ?쒓컖 : ";
			errorContents += EgovDateUtil.convertDate(target.getCreatDt(), "", "", "");
			errorContents += "\n";
			if (target.getLogInfo() != null && !target.getLogInfo().equals("")) {
				errorContents += target.getProcessNm() + " ???꾨줈?몄뒪 ?곹깭媛 鍮꾩젙?곸엯?덈떎.  \n濡쒓렇瑜??뺤씤?댁＜?몄슂.";
			}
			text = EgovStringUtil.replace(text, "{?먮윭?댁슜}", errorContents);
			msg.setText(text);
		}

		this.mntrngMailSender.send(msg);
	}

}
