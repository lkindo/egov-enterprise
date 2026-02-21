package egovframework.com.utl.sys.prm.service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;

import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.cmm.service.FileSystemUtils;
import egovframework.com.cmm.service.Globals;

/**
 * <pre>
 * ??
 * - ?? ????? Check ?????
 *
 * ???
 * - ????? ??????.
 * </pre>
 * 
 * @author ??
 * @since 2010.09.07
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2010.09.07  ??         ????
 *   2019.12.06  ???         KISA ?? ??(????????
 *   2022.11.11  ???          ????????
 *   2025.09.15  ????         2025????????PMD???????? ????????-CloseResource(?????? ??)
 *   2025.09.15  ????         2025????????PMD???????? ????????-UselessParentheses(?????????
 *
 *      </pre>
 **/
public class ProcessMonChecker {

	// Log
	//private static final Logger LOGGER = LoggerFactory.getLogger(ProcessMonChecker.class);

	/**
	 * <pre>
	 * Comment : ?? ??????. (
	 * </pre>
	 * 
	 * @param String processName
	 * @return List<String[]> ?? ??????.
	 * @version 1.0 (2009.01.12.)
	 * @see
	 **/
	public static String getProcessId(String processNm) throws IOException {

		Process p = null;
		String procsSttus = null;
		int cnt = 0;

		try {
			if (Globals.OS_TYPE == null) {
				throw new RuntimeException("Globals.OS_TYPE property value is needed!!!");
			}
			// 2011.10.10 ?? ?????

			if ("WINDOWS".equals(Globals.OS_TYPE)) {
				cnt = -1; // ??? ??? ?? ?? ?????????.
				String execStr = "tasklist /fo table /nh /fi \"imagename eq " + processNm + "\"";
				// 2022.11.11 ????????
				FileSystemUtils util = new FileSystemUtils();
				p = util.processOperate("EgovNetworkState", execStr);

			} else if ("UNIX".equals(Globals.OS_TYPE)) {
				String cmd = "/bin/csh" + "-c" + "ps -A | grep " + EgovWebUtil.removeOSCmdRisk(processNm);
				// 2022.11.11 ????????
				FileSystemUtils util = new FileSystemUtils();
				p = util.processOperate("EgovNetworkState", cmd);
			}

			if (p == null) {
				return "02";
			}
			try (BufferedReader buf = new BufferedReader(new InputStreamReader(p.getInputStream()));) {
				while (buf.readLine() != null) {
					cnt++;
				}
			}
			if (cnt > 0) {
				procsSttus = "01";
			} else {
				procsSttus = "02";
			}

		} catch (IOException e) {
			procsSttus = "02";
		}

		return procsSttus;
	}

}
