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

import org.apache.commons.lang3.StringUtils;
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
 * ??
 * - ?????? Service Interface??invoke ?????? ?????? ???.
 *
 * ???
 * - ?????? ? ????????? ??????????? ???????.
 * @author lee.m.j
 * @version 1.0
 * @created 06-9-2010 ?? 11:23:59
 *
 * <pre>
 * << ?????Modification Information) >>
 *
 *  ????     	         ????             ????
 *  ----------   ---------   ---------------------------
 *  2020.11.02   ???             ???????????? ?
 *  2022.11.11   ???              ????????
 *
 * </pre>
 **/

@Service("egovServerResrceMntrngScheduling")
public class EgovServerResrceMntrngScheduling extends EgovAbstractServiceImpl {

	/** logger **/
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
	 * ???? ????????.
	 * @param
	 * @return
	 **/

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
				serverResrceMntrng.setLogInfo("?         ??      ???     ??????     ??");
				sendEmail(serverResrceMntrng);
				// sendSMS(egovServerResrceMntrngService.selectServerResrceMntrng(serverResrceMntrngVO));
			}
			egovServerResrceMntrngService.insertServerResrceMntrng(serverResrceMntrng);

		} catch (IOException e) { //KISA ?? ??(2018-10-29, ????
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
	 * ???? ????????.
	 * @param
	 * @return
	 **/
	public void monitorServerResrce() {

		try {
			List<ServerResrceMntrngVO> result = egovServerResrceMntrngService.selectMntrngServerList(serverResrceMntrngVO);
			for (ServerResrceMntrngVO serverResrceMntrngVO : result) {
				init(serverResrceMntrngVO);
			}
		} catch (NoSuchElementException e) { //KISA ?? ??(2018-10-29, ????
			LOGGER.debug("Server monitoring error - NoSuchElementException", e);

		} catch (Exception e) {
			LOGGER.debug("Server monitoring error", e);
		}
	}

	/**
	 * ???? ???.
	 * @param serverResrceMntrngVO - ?????? Vo
	 * @return
	 *
	 * @param serverResrceMntrngVO
	 **/
	public void sendEmail(ServerResrceMntrng serverResrceMntrng) {
		String subject = "";
		String text = "";
		String errorContents = "";

		SimpleMailMessage msg = new SimpleMailMessage(this.mntrngMessage);
		// ????
		msg.setTo(serverResrceMntrng.getMngrEamilAddr());
		// ???
		subject = msg.getSubject();
		// 2022.11.11 ????????
		if (StringUtils.isNotEmpty(subject)) {
			subject = EgovStringUtil.replace(subject, "{         ??         ?         ?", "??      ?   ?   ??      ??      ??         ?);");
			msg.setSubject(subject);
		}
		// ???
		text = msg.getText();
		// 2022.11.11 ????????
		if (StringUtils.isNotEmpty(text)) {
			text = EgovStringUtil.replace(text, "{         ??         ?         ?", "??      ?   ?   ??      ??      ??         ?);");
			errorContents = "??         ?: ";
			errorContents += serverResrceMntrngVO.getServerNm();
			errorContents += "\n";
			errorContents += "??      IP : ";
			errorContents += serverResrceMntrngVO.getServerEqpmnIp();
			errorContents += "\n";
			errorContents += "CPU???      ?: ";
			errorContents += serverResrceMntrngVO.getCpuUseRt();
			errorContents += "\n";
			errorContents += "         ?      ?   ??       : ";
			errorContents += serverResrceMntrngVO.getMoryUseRt();
			errorContents += "\n";
			errorContents += "Error...";
			errorContents += "\n";
			errorContents += "??       : ";
			errorContents += serverResrceMntrngVO.getLogInfo();
			errorContents += "\n";
			errorContents += "??      ??       : ";
			errorContents += EgovDateUtil.convertDate(serverResrceMntrngVO.getCreatDt(), "", "", "");
			errorContents += "\n";
			errorContents += serverResrceMntrngVO.getServerNm() + " ????      ?   ?    ??      ???                  ??   ??         ??      . \n         ?      ??         ??      ?         .";
			text = EgovStringUtil.replace(text, "{?   ?   ??      }", errorContents);
			msg.setText(text);
		}

		this.mntrngMailSender.send(msg);
	}

	public void sendSMS(ServerResrceMntrng serverResrceMntrng) throws Exception {
		String[] receiveTelno = { "010-6802-0886" };
		Sms sms = new Sms();
		sms.setTrnsmitTelno("000-000-0000"); // ???
		sms.setRecptnTelno(receiveTelno); // ????
// 		sms.setTrnsmitCn("?????????);

		egovSmsInfoService.insertSmsInf(sms);
	}

}
