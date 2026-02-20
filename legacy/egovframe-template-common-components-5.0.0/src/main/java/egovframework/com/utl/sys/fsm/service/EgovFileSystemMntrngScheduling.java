package egovframework.com.utl.sys.fsm.service;

import java.io.IOException;
import java.util.ArrayList;
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

import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.utl.fcc.service.EgovDateUtil;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;

/**
 * 媛쒖슂
 * - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅???꾪븳 ?ㅼ?伊대쭅?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 湲곕뒫???쒓났?쒕떎.
 * - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 寃곌낵瑜?愿由ъ옄?먭쾶 ?대찓?쇰줈 ?꾩넚?쒕떎.
 * @author ?μ쿋??
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 11:33:43
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *  ?섏젙??      ?섏젙??    ?섏젙?댁슜
 *  ----------   --------   ---------------------------
 *  2017.03.03 	 議곗꽦??	?쒗걧?댁퐫??ES)-Null Pointer ??갭議?CWE-476]
 *  2022.11.11   源?쒖?   ?쒗걧?댁퐫??泥섎━
 *  2024.05.02   源?섏슜   NSR 蹂댁븞議곗튂 (?뚯씪?쒖뒪?쒕챸?먯꽌 ?낆쓽?곸씤 臾몄옄???쒓굅)
 *
 */

@Service("egovFileSysMntrngScheduling")
public class EgovFileSystemMntrngScheduling extends EgovAbstractServiceImpl {

	@Resource(name="EgovFileSysMntrngService")
	private EgovFileSysMntrngService ntwrkSvcMntrngService;

	@Resource(name="mntrngMailSender")
    private MailSender mntrngMailSender;

    @Resource(name="mntrngMessage")
    private SimpleMailMessage mntrngMessage;

    private static final Logger LOGGER = LoggerFactory.getLogger(EgovFileSystemMntrngScheduling.class);

	// 紐⑤땲?곕쭅 ??곸쓣 ?쎄린?꾪븳 ?섏씠吏 ?ш린
	private static final int RECORD_COUNT_PER_PAGE = 10000;

	/**
	 * DB?쒕퉬??紐⑤땲?곕쭅瑜??섑뻾?쒕떎.
	 *
	 * @param
	 * @return
	 * @throws Exception
	 */
	@SuppressWarnings("unchecked")
	public void monitorFileSys() throws Exception {
		// 紐⑤땲?곕쭅 ????뺣낫 ?쎌뼱?ㅼ씠湲?
		Map<String, Object> map = null;
		//2017.03.03 	議곗꽦??	?쒗걧?댁퐫??ES)-Null Pointer ??갭議?CWE-476]
		List<FileSysMntrng> targetList = new ArrayList<>();
		FileSysMntrngVO searchVO = new FileSysMntrngVO();
		// 紐⑤땲?곕쭅 ???寃??議곌굔 珥덇린??
		searchVO.setPageIndex(1);
		searchVO.setFirstIndex(0);
		searchVO.setRecordCountPerPage(RECORD_COUNT_PER_PAGE);
		map = ntwrkSvcMntrngService.selectFileSysMntrngList(searchVO);
		//2017.03.03 	議곗꽦??	?쒗걧?댁퐫??ES)-Null Pointer ??갭議?CWE-476]
		if(map != null){
			targetList = (List<FileSysMntrng>)map.get("resultList");
		}

		LOGGER.debug("議고쉶議곌굔 {}", searchVO);
		LOGGER.debug("Result 嫄댁닔 : {}", targetList.size());
		// ?쒕퉬?ㅼ껜???⑥닔 ?몄텧.
		Iterator<FileSysMntrng> iter = targetList.iterator();
		FileSysMntrng target = null;

		String safeFileSysNm = "";
		int fileSysMg = 0;
		int fileSysThrhld = 0;
		int fileSysUsgQty = 0;
		boolean nrmltAt = true;
		while(iter.hasNext()) {
			nrmltAt = true;
			target = iter.next();
			LOGGER.debug("Data : {}", target);
			// ?쒕퉬??泥댄겕 ?섑뻾.
			java.text.SimpleDateFormat formatter = new java.text.SimpleDateFormat("yyyyMMddHHmmss", java.util.Locale.KOREA);
			target.setCreatDt(formatter.format(new java.util.Date()));

			safeFileSysNm = EgovWebUtil.removeCRLF(target.getFileSysNm()).replaceAll("\\|", "").replaceAll("&", "");
			fileSysThrhld = target.getFileSysThrhld();
			try{
				fileSysMg = FileSystemChecker.totalSpaceGb(safeFileSysNm);
				fileSysUsgQty = fileSysMg - FileSystemChecker.freeSpaceGb(safeFileSysNm);

				target.setFileSysMg(fileSysMg);
				target.setFileSysUsgQty(fileSysUsgQty);
			}catch (IOException e1) {
				target.setLogInfo(e1.getMessage());
				nrmltAt = false;
			}

			if(fileSysUsgQty > fileSysThrhld){
				nrmltAt = false;
			}

			// email ?꾩넚.
			if (!nrmltAt) {
				target.setMntrngSttus("鍮꾩젙??);
				sendEmail(target);
			}

			// DB??寃곌낵媛????
			if (nrmltAt) {
				target.setMntrngSttus("01");
			} else {
				target.setMntrngSttus("02");
			}

			target.setLastUpdusrId("SYSTEM");
			ntwrkSvcMntrngService.updateFileSysMntrngSttus(target);
		}
	}

	/**
	 * ?대찓?쇱쓣 ?꾩넚?쒕떎.
	 *
	 * @param   target   紐⑤땲?곕쭅 ??곸젙蹂?
	 * @return
	 *
	 */
    private void sendEmail(FileSysMntrng target) {
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
			subject = EgovStringUtil.replace(subject, "{紐⑤땲?곕쭅醫낅쪟}", "?뚯씪?쒖뒪?쒕え?덊꽣留?);
	        msg.setSubject(subject);
		}
        // 硫붿씪?댁슜
        text = msg.getText();
        // 2022.11.11 ?쒗걧?댁퐫??泥섎━
     	if (StringUtils.isNotEmpty(subject)) {
	        text = EgovStringUtil.replace(text, "{紐⑤땲?곕쭅醫낅쪟}", "?뚯씪?쒖뒪?쒕え?덊꽣留?);
	        errorContents = "?뚯씪?쒖뒪?쒕챸 : ";
	        errorContents += target.getFileSysNm();
	        errorContents += "\n";
	        errorContents += "?뚯씪?쒖뒪?쒓?由щ챸 : ";
	        errorContents += target.getFileSysManageNm();
	        errorContents += "\n";
	        if(target.getLogInfo() != null && !target.getLogInfo().equals("")){
	        	errorContents += "?대떦?뚯씪???뚯씪?쒖뒪???뺣낫瑜?媛?몄삤?붿쨷 ?먮윭媛 諛쒖깮?섏??듬땲??";
	        }else{
		        errorContents += "?ш린 : ";
		        errorContents += target.getFileSysMg();
		        errorContents += "GB\n";
		        errorContents += "?꾧퀎移?: ";
		        errorContents += target.getFileSysThrhld();
		        errorContents += "GB\n";
		        errorContents += "?ъ슜??: ";
		        errorContents += target.getFileSysUsgQty();
		        errorContents += "GB\n";
	        }
	        errorContents += "?곹깭 : ";
	        errorContents += target.getMntrngSttus();
	        errorContents += "\n";
	        errorContents += "紐⑤땲?곕쭅 ?쒓컖 : ";
	        errorContents += EgovDateUtil.convertDate(target.getCreatDt(), "", "", "");
	        errorContents += "\n";
	        if(target.getLogInfo() != null && !target.getLogInfo().equals("")){
	        	errorContents += target.getFileSysManageNm() + " ???뚯씪?쒖뒪???곹깭媛 鍮꾩젙?곸엯?덈떎.  \n濡쒓렇瑜??뺤씤?댁＜?몄슂.";
	        }else{
	        	errorContents += target.getFileSysManageNm() + " ???뚯씪?쒖뒪?쒖씠 ?꾧퀎移섎? ?섏뿀?듬땲??";
	        }
	        text = EgovStringUtil.replace(text, "{?먮윭?댁슜}", errorContents);
	        msg.setText(text);
     	}

        this.mntrngMailSender.send(msg);
    }

}
