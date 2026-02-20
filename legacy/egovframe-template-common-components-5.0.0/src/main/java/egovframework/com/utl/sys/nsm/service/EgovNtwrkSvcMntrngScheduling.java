package egovframework.com.utl.sys.nsm.service;

import java.util.Iterator;
import java.util.List;
import java.util.Map;

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
 * <pre>
 * 媛쒖슂
 * - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅???꾪븳 ?ㅼ?伊대쭅?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 湲곕뒫???쒓났?쒕떎.
 * - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 寃곌낵瑜?愿由ъ옄?먭쾶 ?대찓?쇰줈 ?꾩넚?쒕떎.
 * </pre>
 * 
 * @author ?μ쿋??
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 11:33:43
 * 
 *          <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *  ?섏젙??      ?섏젙??    ?섏젙?댁슜
 *  ----------   --------   ---------------------------

 *          </pre>
 */
/**
 * <pre>
 * 媛쒖슂
 * - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅???꾪븳 ?ㅼ?伊대쭅?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 湲곕뒫???쒓났?쒕떎.
 * - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 寃곌낵瑜?愿由ъ옄?먭쾶 ?대찓?쇰줈 ?꾩넚?쒕떎.
 * </pre>
 * 
 * @author ?μ쿋??
 * @since 2010.06.28
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.06.28  ?μ쿋??         理쒖큹 ?앹꽦
 *   2022.11.11  源?쒖?          ?쒗걧?댁퐫??泥섎━
 *   2025.09.15  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-UnnecessaryBoxing(遺덊븘?뷀븳 WrapperObject ?앹꽦)
 *
 *      </pre>
 */
@Service("egovNtwrkSvcMntrngScheduling")
public class EgovNtwrkSvcMntrngScheduling extends EgovAbstractServiceImpl {

	@Resource(name = "EgovNtwrkSvcMntrngService")
	private EgovNtwrkSvcMntrngService ntwrkSvcMntrngService;

	@Resource(name = "mntrngMailSender")
	private MailSender mntrngMailSender;

	@Resource(name = "mntrngMessage")
	private SimpleMailMessage mntrngMessage;

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovNtwrkSvcMntrngScheduling.class);

	// 紐⑤땲?곕쭅 ??곸쓣 ?쎄린?꾪븳 ?섏씠吏 ?ш린
	private static final int RECORD_COUNT_PER_PAGE = 10000;

	/**
	 * ?ㅽ듃?뚰겕 ?쒕퉬??紐⑤땲?곕쭅瑜??섑뻾?쒕떎.
	 *
	 * @param
	 * @return
	 * @throws Exception
	 */
	@SuppressWarnings("unchecked")
	public void monitorNtwrkSvc() throws Exception {
		// 紐⑤땲?곕쭅 ????뺣낫 ?쎌뼱?ㅼ씠湲?
		Map<String, Object> map = null;
		List<NtwrkSvcMntrng> targetList = null;
		NtwrkSvcMntrngVO searchVO = new NtwrkSvcMntrngVO();
		// 紐⑤땲?곕쭅 ???寃??議곌굔 珥덇린??
		searchVO.setPageIndex(1);
		searchVO.setFirstIndex(0);
		searchVO.setRecordCountPerPage(RECORD_COUNT_PER_PAGE);
		map = ntwrkSvcMntrngService.selectNtwrkSvcMntrngList(searchVO);
		targetList = (List<NtwrkSvcMntrng>) map.get("resultList");
		LOGGER.debug("議고쉶議곌굔 {}", searchVO);
		LOGGER.debug("Result 嫄댁닔 : {}", targetList.size());
		// ?쒕퉬?ㅼ껜???⑥닔 ?몄텧.
		Iterator<NtwrkSvcMntrng> iter = targetList.iterator();
		NtwrkSvcMntrng target = null;
		NtwrkSvcMntrngResult result = null;
		while (iter.hasNext()) {
			target = iter.next();
			LOGGER.debug("Data : {}", target);
			// ?쒕퉬??泥댄겕 ?섑뻾.
			java.text.SimpleDateFormat formatter = new java.text.SimpleDateFormat("yyyyMMddHHmmss", java.util.Locale.KOREA);
			target.setCreatDt(formatter.format(new java.util.Date()));
			result = NtwrkSvcMntrngChecker.check(target.getSysIp(), Integer.parseInt(target.getSysPort()));

			// email ?꾩넚.
			if (!result.isNrmltAt()) {
				target.setMntrngSttus("鍮꾩젙??);
				sendEmail(target);
			}

			// DB??寃곌낵媛????
			if (result.isNrmltAt()) {
				target.setMntrngSttus("01");
			} else {
				target.setMntrngSttus("02");
			}

			// DB??濡쒓렇?뺣낫 ???
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
	 * ?대찓?쇱쓣 ?꾩넚?쒕떎.
	 *
	 * @param target 紐⑤땲?곕쭅 ??곸젙蹂?
	 * @return
	 *
	 */
	private void sendEmail(NtwrkSvcMntrng target) {
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
			subject = EgovStringUtil.replace(subject, "{紐⑤땲?곕쭅醫낅쪟}", "?ㅽ듃?뚰겕?쒕퉬?ㅻえ?덊꽣留?);
			msg.setSubject(subject);
		}
		// 硫붿씪?댁슜
		text = msg.getText();
		// 2022.11.11 ?쒗걧?댁퐫??泥섎━
		if (StringUtils.isNotEmpty(text)) {
			text = EgovStringUtil.replace(text, "{紐⑤땲?곕쭅醫낅쪟}", "?ㅽ듃?뚰겕?쒕퉬?ㅻえ?덊꽣留?);
			errorContents = "?쒕쾭紐?: ";
			errorContents += target.getSysNm();
			errorContents += "\n";
			errorContents += "?쒕쾭IP : ";
			errorContents += target.getSysIp();
			errorContents += "\n";
			errorContents += "?쒕쾭?ы듃 : ";
			errorContents += target.getSysPort();
			errorContents += "\n";
			errorContents += "?곹깭 : ";
			errorContents += target.getMntrngSttus();
			errorContents += "\n";
			errorContents += "紐⑤땲?곕쭅 ?쒓컖 : ";
			errorContents += EgovDateUtil.convertDate(target.getCreatDt(), "", "", "");
			errorContents += "\n";
			errorContents += target.getSysNm() + " ???ㅽ듃?뚰겕 ?쒕퉬???곹깭媛 鍮꾩젙?곸엯?덈떎. \n濡쒓렇瑜??뺤씤?댁＜?몄슂.";
			text = EgovStringUtil.replace(text, "{?먮윭?댁슜}", errorContents);
			msg.setText(text);
		}

		this.mntrngMailSender.send(msg);
	}

}
