package egovframework.com.utl.sim.service;

import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import egovframework.com.cmm.service.EgovProperties;
import egovframework.com.cmm.service.Globals;
import jakarta.servlet.http.HttpServletRequest;

/**
 * ?대씪?댁뼵??Client)??IP二쇱냼, OS?뺣낫, ?밸툕?쇱슦??뺣낫瑜?議고쉶?섎뒗 Business Interface class
 * 
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? 諛뺤???
 * @since 2009.01.19
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.01.19  諛뺤???         理쒖큹 ?앹꽦
 *   2025.09.04  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
public class EgovClntInfo {

	/**
	 * ?대씪?댁뼵??Client)??IP二쇱냼瑜?議고쉶?섎뒗 湲곕뒫
	 * 
	 * @param HttpServletRequest request Request媛앹껜
	 * @return String ipAddr IP二쇱냼
	 * @exception Exception
	 */
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

		// IP二쇱냼
		return ipAddr;
	}

	/**
	 * ?대씪?댁뼵??Client)??OS ?뺣낫瑜?議고쉶?섎뒗 湲곕뒫
	 * 
	 * @param HttpServletRequest request Request媛앹껜
	 * @return String osInfo OS ?뺣낫
	 * @exception Exception
	 */
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
	 * ?대씪?댁뼵??Client)???밸툕?쇱슦? 醫낅쪟瑜?議고쉶?섎뒗 湲곕뒫
	 * 
	 * @param HttpServletRequest request Request媛앹껜
	 * @return String webKind ?밸툕?쇱슦? 醫낅쪟
	 * @exception Exception
	 */
	public static String getClntWebKind(HttpServletRequest request) throws Exception {

		String userAgent = request.getHeader("user-agent");

		// ?밸툕?쇱슦? 醫낅쪟 議고쉶
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
	 * ?대씪?댁뼵??Client)???밸툕?쇱슦? 踰꾩쟾??議고쉶?섎뒗 湲곕뒫
	 * 
	 * @param HttpServletRequest request Request媛앹껜
	 * @return String webVer ?밸툕?쇱슦? 踰꾩쟾
	 * @exception Exception
	 */
	public static String getClntWebVer(HttpServletRequest request) throws Exception {

		String userAgent = request.getHeader("user-agent");

		// ?밸툕?쇱슦? 踰꾩쟾 議고쉶
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
