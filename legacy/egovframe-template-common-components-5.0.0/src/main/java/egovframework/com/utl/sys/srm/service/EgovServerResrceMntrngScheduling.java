package egovframework.com.utl.sys.srm.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.InetAddress;
import java.util.List;
import java.util.NoSuchElementException;

import javax.management.MBeanAttributeInfo;
import javax.management.MBeanInfo;
import javax.management.MBeanServerConnection;
import javax.management.ObjectName;
import javax.management.remote.JMXConnector;
import javax.management.remote.JMXConnectorFactory;
import javax.management.remote.JMXServiceURL;

import org.apache.commons.lang.StringUtils;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailSender;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.stereotype.Service;

import egovframework.com.cmm.util.EgovResourceCloseHelper;
import egovframework.com.cop.sms.service.EgovSmsInfoService;
import egovframework.com.cop.sms.service.Sms;
import egovframework.com.utl.fcc.service.EgovDateUtil;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;

/**
 * 媛쒖슂
 * - ?쒕쾭?먯썝紐⑤땲?곕쭅 Service Interface瑜?invoke ?????덈뒗 ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?쒕쾭?먯썝紐⑤땲?곕쭅 ?뺣낫 寃곌낵瑜??뺤씤?????덈뒗 ?⑥닔瑜??몄텧?????덈뒗 湲곕뒫???쒓났?쒕떎.
 * @author lee.m.j
 * @version 1.0
 * @created 06-9-2010 ?ㅼ쟾 11:23:59
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *  ?섏젙??     	         ?섏젙??             ?섏젙?댁슜
 *  ----------   ---------   ---------------------------
 *  2020.11.02   ?좎슜??             遺덊븘?뷀븳 硫ㅻ쾭蹂??吏????섎줈 蹂寃?
 *  2022.11.11   源?쒖?              ?쒗걧?댁퐫??泥섎━
 *
 * </pre>
 */

@Service("egovServerResrceMntrngScheduling")
public class EgovServerResrceMntrngScheduling extends EgovAbstractServiceImpl {

	/** logger */
	private static final Logger LOGGER = LoggerFactory.getLogger(EgovServerResrceMntrngScheduling.class);

	@Resource(name = "egovServerResrceMntrngService")
	private EgovServerResrceMntrngService egovServerResrceMntrngService;

	@Resource(name = "EgovSmsInfoService")
	private EgovSmsInfoService egovSmsInfoService;

	@Resource(name = "mntrngMessage")
	private SimpleMailMessage mntrngMessage;

	@Resource(name = "mntrngMailSender")
	private MailSender mntrngMailSender;

	private ServerResrceMntrngVO serverResrceMntrngVO = null;

	/**
	 * ?쒕쾭?먯썝 紐⑤땲?곕쭅瑜??섑뻾?쒕떎.
	 * @param
	 * @return
	 */

	public void init(ServerResrceMntrngVO serverResrceMntrngVO) throws Exception {

		JMXServiceURL address = null;
		JMXConnector connector = null;
		MBeanServerConnection mbs = null;
		ObjectName name = null;
		MBeanInfo mBeanInfo = null;
		MBeanAttributeInfo[] attrInfos = null;
		ServerResrceMntrng serverResrceMntrng = null;

		String serverId = serverResrceMntrngVO.getServerId();
		String serverEqpmnId = serverResrceMntrngVO.getServerEqpmnId();
		String serverNm = serverResrceMntrngVO.getServerNm();
		String serverEqpmnIp = serverResrceMntrngVO.getServerEqpmnIp();
		String mngrEamilAddr = serverResrceMntrngVO.getMngrEamilAddr();

		serverResrceMntrng = new ServerResrceMntrng();
		serverResrceMntrng.setServerId(serverId);
		serverResrceMntrng.setServerEqpmnId(serverEqpmnId);
		serverResrceMntrng.setServerNm(serverNm);
		serverResrceMntrng.setServerEqpmnIp(serverEqpmnIp);
		serverResrceMntrng.setMngrEamilAddr(mngrEamilAddr);

		try {
			address = new JMXServiceURL("service:jmx:rmi://" + serverEqpmnIp + ":9999/jndi/rmi://" + serverEqpmnIp + ":9999/server");
			connector = JMXConnectorFactory.connect(address);

			mbs = connector.getMBeanServerConnection();

			name = new ObjectName("egovframework.com.utl.sys.srm.service:type=EgovServerResrceMntrng");

			mBeanInfo = mbs.getMBeanInfo(name);
			attrInfos = mBeanInfo.getAttributes();

			for (MBeanAttributeInfo attrInfo : attrInfos) {
				if (attrInfo.getName().equals("CpuUsage")) {
					serverResrceMntrng.setCpuUseRt(mbs.getAttribute(name, attrInfo.getName()).toString());
				} else if (attrInfo.getName().equals("MemoryUsage")) {
					serverResrceMntrng.setMoryUseRt(mbs.getAttribute(name, attrInfo.getName()).toString());
				}
				LOGGER.info(attrInfo.getName() + " = " + mbs.getAttribute(name, attrInfo.getName()));
			}
			serverResrceMntrng.setSvcSttus("01");
			serverResrceMntrng.setFrstRegisterId(InetAddress.getLocalHost().getHostAddress());
			serverResrceMntrng.setLastUpdusrId("SYSTEM");

			if (Double.parseDouble(serverResrceMntrng.getCpuUseRt()) > 90 || Double.parseDouble(serverResrceMntrng.getMoryUseRt()) > 90) {
				serverResrceMntrng.setSvcSttus("02");
				serverResrceMntrng.setLogInfo("?곸젙?섏튂瑜?珥덇낵?섏??듬땲??");
				sendEmail(serverResrceMntrng);
				// sendSMS(egovServerResrceMntrngService.selectServerResrceMntrng(serverResrceMntrngVO));
			}
			egovServerResrceMntrngService.insertServerResrceMntrng(serverResrceMntrng);

		} catch (IOException e) { //KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
			serverResrceMntrng.setSvcSttus("02");

			ByteArrayOutputStream out = new ByteArrayOutputStream();

			LOGGER.debug("JMX error", e);

			String logInfo = out.toString();
			byte[] btLogInfo = logInfo.getBytes();

			if (btLogInfo.length > 2000) {
				logInfo = new String(btLogInfo, 0, 2000);
			}

			serverResrceMntrng.setLogInfo(logInfo);
			serverResrceMntrng.setFrstRegisterId(InetAddress.getLocalHost().getHostAddress());
			serverResrceMntrng.setLastUpdusrId("SYSTEM");

			egovServerResrceMntrngService.insertServerResrceMntrng(serverResrceMntrng);

		} catch (Exception e) {

			serverResrceMntrng.setSvcSttus("02");

			ByteArrayOutputStream out = new ByteArrayOutputStream();

			LOGGER.debug("JMX error", e);

			String logInfo = out.toString();
			byte[] btLogInfo = logInfo.getBytes();

			if (btLogInfo.length > 2000) {
				logInfo = new String(btLogInfo, 0, 2000);
			}

			serverResrceMntrng.setLogInfo(logInfo);
			serverResrceMntrng.setFrstRegisterId(InetAddress.getLocalHost().getHostAddress());
			serverResrceMntrng.setLastUpdusrId("SYSTEM");

			egovServerResrceMntrngService.insertServerResrceMntrng(serverResrceMntrng);

		} finally {
			EgovResourceCloseHelper.close(connector);
		}
	}

	/**
	 * ?쒕쾭?먯썝 紐⑤땲?곕쭅瑜??섑뻾?쒕떎.
	 * @param
	 * @return
	 */
	public void monitorServerResrce() {

		try {
			List<ServerResrceMntrngVO> result = egovServerResrceMntrngService.selectMntrngServerList(serverResrceMntrngVO);
			for (ServerResrceMntrngVO serverResrceMntrngVO : result) {
				init(serverResrceMntrngVO);
			}
		} catch (NoSuchElementException e) { //KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
			LOGGER.debug("Server monitoring error - NoSuchElementException", e);

		} catch (Exception e) {
			LOGGER.debug("Server monitoring error", e);
		}
	}

	/**
	 * ?대찓?쇱쓣 ?꾩넚?쒕떎.
	 * @param serverResrceMntrngVO - ?쒕쾭?먯썝紐⑤땲?곕쭅 Vo
	 * @return
	 *
	 * @param serverResrceMntrngVO
	 */
	public void sendEmail(ServerResrceMntrng serverResrceMntrng) {
		String subject = "";
		String text = "";
		String errorContents = "";

		SimpleMailMessage msg = new SimpleMailMessage(this.mntrngMessage);
		// ?섏떊??
		msg.setTo(serverResrceMntrng.getMngrEamilAddr());
		// 硫붿씪?쒕ぉ
		subject = msg.getSubject();
		// 2022.11.11 ?쒗걧?댁퐫??泥섎━
		if (StringUtils.isNotEmpty(subject)) {
			subject = EgovStringUtil.replace(subject, "{紐⑤땲?곕쭅醫낅쪟}", "?쒕쾭?먯썝?쒕퉬?ㅻえ?덊꽣留?);
			msg.setSubject(subject);
		}
		// 硫붿씪?댁슜
		text = msg.getText();
		// 2022.11.11 ?쒗걧?댁퐫??泥섎━
		if (StringUtils.isNotEmpty(text)) {
			text = EgovStringUtil.replace(text, "{紐⑤땲?곕쭅醫낅쪟}", "?쒕쾭?먯썝?쒕퉬?ㅻえ?덊꽣留?);
			errorContents = "?쒕쾭紐?: ";
			errorContents += serverResrceMntrngVO.getServerNm();
			errorContents += "\n";
			errorContents += "?쒕쾭IP : ";
			errorContents += serverResrceMntrngVO.getServerEqpmnIp();
			errorContents += "\n";
			errorContents += "CPU?ъ슜瑜?: ";
			errorContents += serverResrceMntrngVO.getCpuUseRt();
			errorContents += "\n";
			errorContents += "硫붾え由ъ궗?⑸쪧 : ";
			errorContents += serverResrceMntrngVO.getMoryUseRt();
			errorContents += "\n";
			errorContents += "?쒕퉬?ㅼ긽??: 鍮꾩젙??;
			errorContents += "\n";
			errorContents += "?댁슜 : ";
			errorContents += serverResrceMntrngVO.getLogInfo();
			errorContents += "\n";
			errorContents += "?앹꽦?쇱떆 : ";
			errorContents += EgovDateUtil.convertDate(serverResrceMntrngVO.getCreatDt(), "", "", "");
			errorContents += "\n";
			errorContents += serverResrceMntrngVO.getServerNm() + " ???쒕쾭?먯썝 ?쒕퉬???곹깭媛 鍮꾩젙?곸엯?덈떎. \n濡쒓렇瑜??뺤씤?댁＜?몄슂.";
			text = EgovStringUtil.replace(text, "{?먮윭?댁슜}", errorContents);
			msg.setText(text);
		}

		this.mntrngMailSender.send(msg);
	}

	public void sendSMS(ServerResrceMntrng serverResrceMntrng) throws Exception {
		String[] receiveTelno = { "010-6802-0886" };
		Sms sms = new Sms();
		sms.setTrnsmitTelno("000-000-0000"); // 諛쒖떊??
		sms.setRecptnTelno(receiveTelno); // ?섏떊??
		sms.setTrnsmitCn("?뚯뒪???낅땲??);

		egovSmsInfoService.insertSmsInf(sms);
	}

}
