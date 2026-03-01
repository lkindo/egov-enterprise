**
 *  Class Name : EgovNetworkState.java
 *  Description : ?ㅽ듃?뚰겕(Network)?곹깭 泥댄겕 Business Interface class
 *  Modification Information
 *
 *     ?섏젙??        ?섏젙??                  ?섏젙?댁슜
 *   -------    --------    ---------------------------
 *   2009.02.02    ????         理쒖큹 ?앹꽦
 *
 *  @author 怨듯넻 ?쒕퉬??媛쒕컻? ????
 *  @since 2009. 02. 02
 *  @version 1.0
 *  @see
 * The type com.sun.star.lang.XeventListener cannot be resolved. It is indirectly referenced from required .class files
 *  Copyright (C) 2009 by EGOV  All right reserved.
 */

package egovframework.com.utl.sim.service;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.InetAddress;
import java.util.ArrayList;
import java.util.List;

import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.cmm.service.EgovProperties;
import egovframework.com.cmm.service.FileSystemUtils;
import egovframework.com.cmm.service.Globals;
import egovframework.com.cmm.util.EgovResourceCloseHelper;

/**
 * EgovNetworkState ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * @author 源吏꾨쭔
 * @see
 * <pre>
 * == 媛쒖젙?대젰(Modification Information) ==
 *
 *  ?섏젙??	?섏젙??	?섏젙?댁슜
 *  ----------	--------	---------------------------
 *  2020.12.07	?좎슜??	KISA 蹂댁븞?쎌젏 議곗튂
 *  2022.11.11	源?쒖?		?쒗걧?댁퐫??泥섎━
 *  2023.06.09	源?좏빐		NSR 蹂댁븞議곗튂 (SCAN 湲곕뒫 援ы쁽 異붽?)
 *
 * </pre>
 */

public class EgovNetworkState {
	public static String addrIP = "";
	static final char FILE_SEPARATOR = File.separatorChar;
	// 理쒕? 臾몄옄湲몄씠
	static final int MAX_STR_LEN = 1024;

	public static final int BUFF_SIZE = 2048;
	// Log
	//
                     static final Log log = LogFactory.getLog(EgovNetworkState.class);

	/**
	 * <pre>
	 * Comment : Local MAC Address瑜??뺤씤?쒕떎.
	 * </pre>
	 * @param String localIP  濡쒖뺄 IP二쇱냼
	 * @return String mac        MAC Address瑜?由ы꽩?쒕떎.
	 * @version 1.0 (2009.02.03.)
	 * @see
	 */
	public static String getMyMACAddress(String localIP) {
		//log.debug("getMyMACAddress Start!! : ");
		String mac = null;
		try {
			if ("WINDOWS".equals(Globals.OS_TYPE)) {
				// 2020-12-07 KISA 蹂댁븞肄붾뱶 寃利?議곗튂
				if (!EgovWebUtil.isIPAddress(localIP)) {
					throw new SecurityException("IP Address is Not Valid~~~!");
				}

				String execStr = "nbtstat -A " + localIP;
				// 2022.11.11 ?쒗걧?댁퐫??泥섎━
				FileSystemUtils util = new FileSystemUtils();
				Process p = util.processOperate("EgovNetworkState", execStr);
				InputStream in = p.getInputStream();
				String out = null;
				int c;
				while ((c = in.read()) != -1) {
					out = out + new String(new Character((char) c).toString());
				}
				in.close();
				if (out == null || out.indexOf("MAC Address = ") == -1) {
					throw new IllegalArgumentException("String Split Error!");
				}
				mac = out.substring(out.indexOf("MAC Address = ") + 14, out.indexOf("MAC Address = ") + 31);

			} else if ("UNIX".equals(Globals.OS_TYPE)) {
				//log.debug("getMyMACAddress IP : " + localIP);
				mac = getNetWorkInfo("MAC");
			}
		} catch (IOException e) {
			throw new RuntimeException(e);
		}
		return mac;
	}

	/**
	 * <pre>
	 * Comment : Local Port瑜??뺤씤?쒕떎.
	 * </pre>

	 * @return String port       port瑜?由ы꽩?쒕떎.
	 * @version 1.0 (2009.02.03.)
	 * @see
	 */
	public static List<String> getMyPortScan() {

		List<String> processes = new ArrayList<>();
		BufferedReader input = null;

		try {

			if ("WINDOWS".equals(Globals.OS_TYPE)) {
				String execStr = "netstat -an";
				// 2022.11.11 ?쒗걧?댁퐫??泥섎━
				FileSystemUtils util = new FileSystemUtils();
				Process p = util.processOperate("EgovNetworkState", execStr);
				input = new BufferedReader(new InputStreamReader(p.getInputStream()));

				while (true) {
					String str = input.readLine();
					if (str == null) {
						break;
					}
					if (str.length() >= MAX_STR_LEN) {
						throw new RuntimeException("input too long");
					}
					if (!str.trim().equals("")) {
						processes.add(str);
					}
				}
			} else if ("UNIX".equals(Globals.OS_TYPE)) {
				String cmdStr = EgovProperties.getPathProperty(Globals.SERVER_CONF_PATH, "SHELL." + Globals.OS_TYPE + ".getNetWorkInfo");
				String command = cmdStr.replace('\\', FILE_SEPARATOR).replace('/', FILE_SEPARATOR) + "SCAN";
				// 2022.11.11 ?쒗걧?댁퐫??泥섎━
				FileSystemUtils util = new FileSystemUtils();
				Process p = util.processOperate("EgovNetworkState", command);
				input = new BufferedReader(new InputStreamReader(p.getInputStream()));
				while (true) {
					String str = input.readLine();
					if (str == null) {
						break;
					}
					if (str.length() >= MAX_STR_LEN) {
						throw new RuntimeException("input too long");
					}
					if (!str.trim().equals("")) {
						processes.add(str);
					}
				}
			}
		} catch (IOException e) {
			throw new RuntimeException("IO Exception", e);
		} finally {
			EgovResourceCloseHelper.close(input);
		}

		return processes;
	}

	/**
	 * <pre>
	 * Comment : Local IPAddress瑜??뺤씤?쒕떎.
	 * </pre>
	 * @return String mac        Local IPAddress瑜?由ы꽩?쒕떎.
	 * @version 1.0 (2009.02.03.)
	 * @see
	 */
	public static String getMyIPaddress() {
		try {

			if (!EgovWebUtil.isIPAddress(InetAddress.getLocalHost().getHostAddress())) {
				throw new RuntimeException("IP is needed. (" + InetAddress.getLocalHost().getHostAddress() + ")");
			}

			InetAddress InetA = InetAddress.getLocalHost();
			addrIP = InetA.getHostAddress();

		} catch (IOException ex) {
			throw new RuntimeException(ex);
		}

		return addrIP;
	}

	/**
	 * <pre>
	 * Comment : ?ㅽ듃?뚰겕 ?곹깭泥댄겕瑜??뺤씤?쒕떎.
	 * </pre>
	 * @param String localIP           localhost, gateway, host 二쇱냼
	 * @return boolean  status         true/false 瑜?由ы꽩?쒕떎.
	 * @version 1.0 (2009.02.03.)
	 * @see
	 */
	public static boolean getPingTest(String requestIP) throws Exception {

		boolean status = false;

		if (!EgovWebUtil.isIPAddress(requestIP)) {
			throw new RuntimeException("IP is needed. (" + requestIP + ")");
		}

		status = InetAddress.getByName(requestIP).isReachable(3000);

		return status;
	}

	/**
	 * <pre>
	 * Comment : ?ㅽ듃?뚰겕(MAC,IP,S/M,G/W,DNS) ?뺣낫瑜??뺤씤?쒕떎.
	 * </pre>
	 * @param String stringOne         ?뺤씤???ㅽ듃???뺣낫 ?쒓린 ( ex:"MAC","IP","S/M","G/W","DNS")
	 * @return String (MAC,IP,S/M,G/W,DNS) ?뺣낫瑜?由ы꽩?쒕떎.
	 * @version 1.0 (2009.02.07.)
	 * @see
	 */
	public static String getNetWorkInfo(String stringOne) throws IOException {
		// ?ㅽ뻾??紐낅졊???꾨줈?쇳떚 ?뚯씪?먯꽌 ?뺤씤?쒕떎.
		Process p = null;

		BufferedReader b_out = null;

		String tmp = "";
		String outValue = "";
		try {
			String cmdStr = EgovProperties.getPathProperty(Globals.SERVER_CONF_PATH, "SHELL." + Globals.OS_TYPE + ".getNetWorkInfo");
			String command = cmdStr.replace('\\', FILE_SEPARATOR).replace('/', FILE_SEPARATOR) + stringOne;
			// 2022.11.11 ?쒗걧?댁퐫??泥섎━
			FileSystemUtils util = new FileSystemUtils();
			p = util.processOperate("EgovNetworkState", command);
			b_out = new BufferedReader(new InputStreamReader(p.getInputStream()));
			while (true) {
				tmp = b_out.readLine();
				if (tmp == null) {
					break;
				}
				if (tmp.length() >= MAX_STR_LEN) {
					throw new IllegalArgumentException("input too long");
				}
				// netstat -v ent0 | grep "?섎뱶?⑥뼱 二쇱냼"   -MAC
				// prtconf | grep "IP 二쇱냼"                 -IP
				// prtconf | grep "?쒕툕??留덉뒪??           -SM
				// prtconf | grep "寃뚯씠?몄썾??              -GW
				if ("MAC".equals(stringOne)) {
					outValue = getCharFilter(tmp);
				} else if ("IP".equals(stringOne)) {
					outValue = getCharFilter(tmp);
				} else if ("SM".equals(stringOne)) {
					outValue = getCharFilter(tmp);
				} else if ("GW".equals(stringOne)) {
					outValue = getCharFilter(tmp);
				} else if ("DNS".equals(stringOne)) {
					//tmp = "was?(?? 192.168.200.21?낅땲??;
					outValue = getCharFilter(tmp);
				} else if ("SCAN".equals(stringOne)) {
					outValue = getCharFilter(tmp);
				} else {
					outValue = "?곗씠?媛 議댁옱?섏? ?딆뒿?덈떎.";
				}
			}
		} finally {
			EgovResourceCloseHelper.close(b_out);

			if (p != null) {
				p.destroy();
			}
		}
		return outValue;
	}

	/**
	 * <pre>
	 * Comment : String ??낆쓽 str媛?以??レ옄 ?뺣낫留??꾪꽣留? ?댁븘??由ы꽩.
	 * </pre>
	 * @param String str         ?꾪꽣留?????뺣낫
	 * @return String outValue   ?レ옄 ?뺣낫瑜??꾪꽣留?由ы꽩?쒕떎.
	 * @version 1.0 (2009.02.07.)
	 * @see
	 */
	private static String getCharFilter(String str) {
		String outValue = "";

		for (int i = 0; i < str.length(); i++) {
			char c = str.charAt(i);

			if (c > 45 && c < 59) {
				char cr = c;
				outValue += Character.toString(cr);
			}
		}
		return outValue;
	}
}
