package egovframework.com.utl.sys.fsm.service;

import java.io.IOException;
import java.util.ArrayList;
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

import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.utl.fcc.service.EgovDateUtil;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;

/**
 * ??
 * - ????????????? ?????????? ???.
 *
 * ???
 * - ?????????? ???????.
 * - ?????????? ?????? ???? ???.
 * @author ???
 * @version 1.0
 * @created 28-6-2010 ?? 11:33:43
 *
 * <pre>
 * << ?????Modification Information) >>
 *
 *  ????      ????    ????
 *  ----------   --------   ---------------------------
 *  2017.03.03 	 ??	??????ES)-Null Pointer ?????CWE-476]
 *  2022.11.11   ???   ????????
 *  2024.05.02   ??   NSR ? (????????? ??? ??????)
 *
 **/

@Service("egovFileSysMntrngScheduling")
public class EgovFileSystemMntrngScheduling extends EgovAbstractServiceImpl {

	@Resource(name="EgovFileSysMntrngService")
	private EgovFileSysMntrngService ntwrkSvcMntrngService;

	@Resource(name="mntrngMailSender")
    private MailSender mntrngMailSender;

    @Resource(name="mntrngMessage")
    private SimpleMailMessage mntrngMessage;

    private static final Logger LOGGER = LoggerFactory.getLogger(EgovFileSystemMntrngScheduling.class);

	// ?? ??? ??? ?? ???
	private static final int RECORD_COUNT_PER_PAGE = 10000;

	/**
	 * DB????????????.
	 *
	 * @param
	 * @return
	 * @throws Exception
	 **/
	@SuppressWarnings("unchecked")
	public void monitorFileSys() throws Exception {
		// ?? ????? ?????
		Map<String, Object> map = null;
		//2017.03.03 	??	??????ES)-Null Pointer ?????CWE-476]
		List<FileSysMntrng> targetList = new ArrayList<>();
		FileSysMntrngVO searchVO = new FileSysMntrngVO();
		// ?? ??????????
		searchVO.setPageIndex(1);
		searchVO.setFirstIndex(0);
		searchVO.setRecordCountPerPage(RECORD_COUNT_PER_PAGE);
		map = ntwrkSvcMntrngService.selectFileSysMntrngList(searchVO);
		//2017.03.03 	??	??????ES)-Null Pointer ?????CWE-476]
		if(map != null){
			targetList = (List<FileSysMntrng>)map.get("resultList");
		}

		LOGGER.debug("         ?   ?          {}", searchVO);
		LOGGER.debug("Result          ??: {}", targetList.size());
		// ???????? ?.
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
			// ???????.
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

			// email ?.
			if (!nrmltAt) {
// 				target.setMntrngSttus("?????);
				sendEmail(target);
			}

			// DB????????
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
	 * ???? ???.
	 *
	 * @param   target   ?? ????
	 * @return
	 *
	 **/
    private void sendEmail(FileSysMntrng target) {
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
			subject = EgovStringUtil.replace(subject, "{         ??         ?         ?", "???   ??      ??      ??         ?);"); // force closed
	        msg.setSubject(subject);
		}
        // ???
        text = msg.getText();
        // 2022.11.11 ????????
     	if (StringUtils.isNotEmpty(subject)) {
	        text = EgovStringUtil.replace(text, "{         ??         ?         ?", "???   ??      ??      ??         ?);"); // force closed
	        errorContents = "???   ??      ??       : ";
	        errorContents += target.getFileSysNm();
	        errorContents += "\n";
	        errorContents += "???   ??      ????          : ";
	        errorContents += target.getFileSysManageNm();
	        errorContents += "\n";
	        if(target.getLogInfo() != null && !target.getLogInfo().equals("")){
	        	errorContents += "??  ????   ?????   ??      ???         ??        ?         ?          ?   ?                        ?????     ??";
	        }else{
		        errorContents += "??   ?: ";
		        errorContents += target.getFileSysMg();
		        errorContents += "GB\n";
		        errorContents += "?              ?: ";
		        errorContents += target.getFileSysThrhld();
		        errorContents += "GB\n";
		        errorContents += "?????: ";
		        errorContents += target.getFileSysUsgQty();
		        errorContents += "GB\n";
	        }
	        errorContents += "?          : ";
	        errorContents += target.getMntrngSttus();
	        errorContents += "\n";
	        errorContents += "         ??          ??       : ";
	        errorContents += EgovDateUtil.convertDate(target.getCreatDt(), "", "", "");
	        errorContents += "\n";
	        if(target.getLogInfo() != null && !target.getLogInfo().equals("")){
	        	errorContents += target.getFileSysManageNm() + " ?????   ??      ???                  ??   ??         ??      .  \n         ?      ??         ??      ?         .";
	        }else{
	        	errorContents += target.getFileSysManageNm() + " ?????   ??      ??       ?              ?? ??   ???     ??";
	        }
	        text = EgovStringUtil.replace(text, "{?   ?   ??      }", errorContents);
	        msg.setText(text);
     	}

        this.mntrngMailSender.send(msg);
    }

}
