package egovframework.com.utl.sim.service;

import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import egovframework.com.cmm.service.EgovProperties;
import egovframework.com.cmm.service.Globals;
import jakarta.servlet.http.HttpServletRequest;

/**
 * ???????Client)??IP?? OS?, ??????????? Business Interface class
 * 
 * @author ????????? ???
 * @since 2009.01.19
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.01.19  ???         ????
 *   2025.09.04  ????         2025????????PMD???????? ????????-LocalVariableNamingConventions(final??? ?? ??????????)
 *
 *      </pre>
 **/
public class EgovClntInfo {

	/**
	 * ???????Client)??IP????? ??
	 * 
	 * @param HttpServletRequest request Request?
	 * @return String ipAddr IP??
	 * @exception Exception
	 **/
	public static String getClntIP(HttpServletRequest request) throws Exception {

		String ipAddr = null;

		HttpServletRequest req = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes())
				.getRequest();

		ipAddr = request.getHeader("X-Forwarded-For");
		if (ipAddr == null || ipAddr.length() == 0 || "unknown".equalsIgnoreCase(ipAddr)) {
			ipAddr = req.getHeader("Proxy-Client-IP");
		}
		if (ipAddr == null || ipAddr.length() == 0 || "unknown".equalsIgnoreCase(ipAddr)) {
			ipAddr = req.getHeader("WL-Proxy-Client-IP");
		}
		if (ipAddr == null || ipAddr.length() == 0 || "unknown".equalsIgnoreCase(ipAddr)) {
			ipAddr = req.getHeader("HTTP_CLIENT_IP");
		}
		if (ipAddr == null || ipAddr.length() == 0 || "unknown".equalsIgnoreCase(ipAddr)) {
			ipAddr = req.getHeader("HTTP_X_FORWARDED_FOR");
		}
		if (ipAddr == null || ipAddr.length() == 0 || "unknown".equalsIgnoreCase(ipAddr)) {
			ipAddr = req.getHeader("X-Real-IP");
		}
		if (ipAddr == null || ipAddr.length() == 0 || "unknown".equalsIgnoreCase(ipAddr)) {
			ipAddr = req.getHeader("X-RealIP");
		}
		if (ipAddr == null || ipAddr.length() == 0 || "unknown".equalsIgnoreCase(ipAddr)) {
			ipAddr = req.getHeader("REMOTE_ADDR");
		}
		if (ipAddr == null || ipAddr.length() == 0 || "unknown".equalsIgnoreCase(ipAddr)) {
			ipAddr = req.getRemoteAddr();
		}

		// IP??
		return ipAddr;
	}

	/**
	 * ???????Client)??OS ?????? ??
	 * 
	 * @param HttpServletRequest request Request?
	 * @return String osInfo OS ?
	 * @exception Exception
	 **/
	public static String getClntOsInfo(HttpServletRequest request) throws Exception {

		String userAgent = request.getHeader("user-agent");
		String osinfo2 = userAgent.toUpperCase().split(";")[2].split("\\)")[0];
		String osConf = EgovProperties.getProperty(Globals.CLIENT_CONF_PATH, osinfo2.replaceAll(" ", ""));
		String osInfo = "";
		if (osConf != null && !"".equals(osConf)) {
			osInfo = osConf;
		} else {
			osInfo = osinfo2;
		}
		return osInfo;
	}

	/**
	 * ???????Client)??????? ????? ??
	 * 
	 * @param HttpServletRequest request Request?
	 * @return String webKind ????? ??
	 * @exception Exception
	 **/
	public static String getClntWebKind(HttpServletRequest request) throws Exception {

		String userAgent = request.getHeader("user-agent");

		// ????? ????
		String webKind = "";
		if (userAgent.toUpperCase().indexOf("GECKO") != -1) {
			if (userAgent.toUpperCase().indexOf("NESCAPE") != -1) {
				webKind = "Netscape (Gecko/Netscape)";
			} else if (userAgent.toUpperCase().indexOf("FIREFOX") != -1) {
				webKind = "Mozilla Firefox (Gecko/Firefox)";
			} else {
				webKind = "Mozilla (Gecko/Mozilla)";
			}
		} else if (userAgent.toUpperCase().indexOf("MSIE") != -1) {
			if (userAgent.toUpperCase().indexOf("OPERA") != -1) {
				webKind = "Opera (MSIE/Opera/Compatible)";
			} else {
				webKind = "Internet Explorer (MSIE/Compatible)";
			}
		} else if (userAgent.toUpperCase().indexOf("SAFARI") != -1) {
			if (userAgent.toUpperCase().indexOf("CHROME") != -1) {
				webKind = "Google Chrome";
			} else {
				webKind = "Safari";
			}
		} else if (userAgent.toUpperCase().indexOf("THUNDERBIRD") != -1) {
			webKind = "Thunderbird";
		} else {
			webKind = "Other Web Browsers";
		}
		return webKind;
	}

	/**
	 * ???????Client)??????? ?????? ??
	 * 
	 * @param HttpServletRequest request Request?
	 * @return String webVer ????? ??
	 * @exception Exception
	 **/
	public static String getClntWebVer(HttpServletRequest request) throws Exception {

		String userAgent = request.getHeader("user-agent");

		// ????? ????
		String webVer = "";
		String[] arr = { "MSIE", "OPERA", "NETSCAPE", "FIREFOX", "SAFARI" };
		for (int i = 0; i < arr.length; i++) {
			int sLoc = userAgent.toUpperCase().indexOf(arr[i]);
			if (sLoc != -1) {
				int fLoc = sLoc + arr[i].length();
				webVer = userAgent.toUpperCase().substring(fLoc, fLoc + 5);
				webVer = webVer.replaceAll("/", "").replaceAll(";", "").replaceAll("^", "").replaceAll(",", "")
						.replaceAll("//.", "");
			}
		}
		return webVer;
	}
}
