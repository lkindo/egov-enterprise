/**
 *  Class Name : EgovNetworkState.java
 *  Description : ????(Network)? ?Business Interface class
 *  Modification Information
 *
 *     ????        ????                  ????
 *   -------    --------    ---------------------------
 *   2009.02.02    ????         ????
 *
 *  @author ????????? ????
 *  @since 2009. 02. 02
 *  @version 1.0
 *  @see
 * The type com.sun.star.lang.XeventListener cannot be resolved. It is indirectly referenced from required .class files
 *  Copyright (C) 2009 by EGOV  All right reserved.
 **/

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
 * EgovNetworkState ?????? ???.
 *
 * @author ?
 * @see
 * 
 *      <pre>
 * == ?????Modification Information) ==
 *
 *  ????	????	????
 *  ----------	--------	---------------------------
 *  2020.12.07	???	KISA ?? ??
 *  2022.11.11	???		????????
 *  2023.06.09	?		NSR ? (SCAN ??? ??)
 *
 *      </pre>
 **/

public class EgovNetworkState {
	public static String addrIP = "";
	static final char FILE_SEPARATOR = File.separatorChar;
	// ? ??
	static final int MAX_STR_LEN = 1024;

	public static final int BUFF_SIZE = 2048;
	// Log
	// protected static final Log log = LogFactory.getLog(EgovNetworkState.class);

	/**
	 * <pre>
	 * Comment : Local MAC Address?????.
	 * </pre>
	 * 
	 * @param String localIP ?IP??
	 * @return String mac MAC Address?????.
	 * @version 1.0 (2009.02.03.)
	 * @see
	 **/
	public static String getMyMACAddress(String localIP) {
		// log.debug("getMyMACAddress Start!! : ");
		String mac = null;
		try {
			if ("WINDOWS".equals(Globals.OS_TYPE)) {
				// 2020-12-07 KISA  ???
				if (!EgovWebUtil.isIPAddress(localIP)) {
					throw new SecurityException("IP Address is Not Valid~~~!");
				}

				String execStr = "nbtstat -A " + localIP;
				// 2022.11.11 ????????
				FileSystemUtils util = new FileSystemUtils();
				Process p = util.processOperate("EgovNetworkState", execStr);
				InputStream in = p.getInputStream();
				StringBuilder out = new StringBuilder();
				int c;
				while ((c = in.read()) != -1) {
					out.append((char) c);
				}
				in.close();
				String outStr = out.toString();
				if (outStr.indexOf("MAC Address = ") == -1) {
					throw new IllegalArgumentException("String Split Error!");
				}
				mac = outStr.substring(outStr.indexOf("MAC Address = ") + 14, outStr.indexOf("MAC Address = ") + 31);

			} else if ("UNIX".equals(Globals.OS_TYPE)) {
				// log.debug("getMyMACAddress IP : " + localIP);
				mac = getNetWorkInfo("MAC");
			}
		} catch (IOException e) {
			throw new RuntimeException(e);
		}
		return mac;
	}

	/**
	 * <pre>
	 * Comment : Local Port?????.
	 * </pre>
	 * 
	 * @return String port port?????.
	 * @version 1.0 (2009.02.03.)
	 * @see
	 **/
	public static List<String> getMyPortScan() {

		List<String> processes = new ArrayList<>();
		BufferedReader input = null;

		try {

			if ("WINDOWS".equals(Globals.OS_TYPE)) {
				String execStr = "netstat -an";
				// 2022.11.11 ????????
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
				String cmdStr = EgovProperties.getPathProperty(Globals.SERVER_CONF_PATH,
						"SHELL." + Globals.OS_TYPE + ".getNetWorkInfo");
				String command = cmdStr.replace('\\', FILE_SEPARATOR).replace('/', FILE_SEPARATOR) + "SCAN";
				// 2022.11.11 ????????
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
	 * Comment : Local IPAddress?????.
	 * </pre>
	 * 
	 * @return String mac Local IPAddress?????.
	 * @version 1.0 (2009.02.03.)
	 * @see
	 **/
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
	 * Comment : ???? ?????.
	 * </pre>
	 * 
	 * @param String localIP localhost, gateway, host ??
	 * @return boolean status true/false ?????.
	 * @version 1.0 (2009.02.03.)
	 * @see
	 **/
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
	 * Comment : ????(MAC,IP,S M,G/W,DNS) ?         ???         ??      .   
	 * </pre>
	 * 
	 * @param String stringOne ?         ????      ???          ??       ( ex:"MAC","IP","S/M","G/W","DNS")
	 * @return String (MAC,IP,S/M,G/W,DNS) ?         ???         ??      .
	 * @version 1.0 (2009.02.07.)
	 * @see
	 */
	public static String getNetWorkInfo(String stringOne) throws IOException {
		// ????????? ????? ???.
		Process p = null;

		BufferedReader b_out = null;

		String tmp = "";
		String outValue = "";
		try {
			String cmdStr = EgovProperties.getPathProperty(Globals.SERVER_CONF_PATH,
					"SHELL." + Globals.OS_TYPE + ".getNetWorkInfo");
			String command = cmdStr.replace('\\', FILE_SEPARATOR).replace('/', FILE_SEPARATOR) + stringOne;
			// 2022.11.11 ????????
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
				// netstat -v ent0 | grep "???? ?? -MAC
				// prtconf | grep "IP ?? -IP
				// prtconf | grep "??????? -SM
				// prtconf | grep "???? -GW
				if ("MAC".equals(stringOne)) {
					outValue = getCharFilter(tmp);
				} else if ("IP".equals(stringOne)) {
					outValue = getCharFilter(tmp);
				} else if ("SM".equals(stringOne)) {
					outValue = getCharFilter(tmp);
				} else if ("GW".equals(stringOne)) {
					outValue = getCharFilter(tmp);
				} else if ("DNS".equals(stringOne)) {
					// tmp = "was??(?? 192.168.200.21????;
					outValue = getCharFilter(tmp);
				} else if ("SCAN".equals(stringOne)) {
					outValue = getCharFilter(tmp);
				} else {
					outValue = "?         ??                  ???? ??      ??      .";
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
	 * Comment : String ???? str???? ???? ?????.
	 * </pre>
	 * 
	 * @param String str ???????
	 * @return String outValue ?? ????????.
	 * @version 1.0 (2009.02.07.)
	 * @see
	 **/
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
