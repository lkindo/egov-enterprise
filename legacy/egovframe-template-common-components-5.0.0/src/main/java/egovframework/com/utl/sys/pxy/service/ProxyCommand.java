package egovframework.com.utl.sys.pxy.service;

import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.net.Socket;

import javax.net.ssl.SSLSocketFactory;

import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.cmm.util.EgovResourceCloseHelper;

/**
 * ?꾨줉?쒖꽌鍮꾩뒪 泥섎━ ?대옒??
 *
 * @author 源吏꾨쭔
 * @since 2010.07.15
 * @version 1.0
 * @see
 * <pre>
 * == 媛쒖젙?대젰(Modification Information) ==
 *
 *  ?섏젙??               ?섏젙??            ?섏젙?댁슜
 *  ----------   --------    ---------------------------
 *  2019.12.05   ?좎슜??             KISA 蹂댁븞?쎌젏 議곗튂 (寃쎈줈議곗옉諛??먯썝 ?쎌엯)
 * </pre>
 */

public class ProxyCommand {

	Socket clientSocket;
	DataInputStream disReader;
	DataOutputStream dosWriter;

	String strReceive = null;
	String strLog = null;

	private String proxyIp;
	private int proxyPort;

	public ProxyCommand(String proxyIp, int proxyPort) {
		setProxyIp(proxyIp);
		setProxyPort(proxyPort);
	}

	public void runCommand(String msg) {
		try {
			proxyIp = EgovWebUtil.filePathBlackList(proxyIp);
			clientSocket = SSLSocketFactory.getDefault().createSocket(proxyIp, proxyPort); //2022.01. Unencrypted Socket 泥섎━

			disReader = new DataInputStream(clientSocket.getInputStream());
			dosWriter = new DataOutputStream(clientSocket.getOutputStream());

			dosWriter.writeUTF(msg);
			dosWriter.flush();
		} catch (IOException e) {
			throw new RuntimeException(e);
		} finally {
			CloseSocket();
		}
	}

	private void CloseSocket() {
		EgovResourceCloseHelper.close(disReader, dosWriter);
		EgovResourceCloseHelper.closeSockets(clientSocket);
	}

	/**
	 * @return the proxyIp
	 */
	public String getProxyIp() {
		return proxyIp;
	}

	/**
	 * @param proxyIp the proxyIp to set
	 */
	public void setProxyIp(String proxyIp) {
		this.proxyIp = proxyIp;
	}

	/**
	 * @return the proxyPort
	 */
	public int getProxyPort() {
		return proxyPort;
	}

	/**
	 * @param proxyPort the proxyPort to set
	 */
	public void setProxyPort(int proxyPort) {
		this.proxyPort = proxyPort;
	}
}
