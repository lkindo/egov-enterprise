package egovframework.com.cmm;

import java.io.File;
import java.util.regex.Pattern;

/**
 * 援먯감?묒냽 ?ㅽ겕由쏀듃 怨듦꺽 痍⑥빟??諛⑹?(?뚮씪誘명꽣 臾몄옄??援먯껜)
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *  ?섏젙??        ?섏젙??    ?섏젙?댁슜
 *  ----------   --------  ---------------------------
 *  2011.10.10   ?쒖꽦怨?     理쒖큹 ?앹꽦
 *	2017-02-07   ?댁젙?      ?쒗걧?댁퐫??ES) - ?쒗걧?댁퐫??寃쎈줈 議곗옉 諛??먯썝 ?쎌엯[CWE-22, CWE-23, CWE-95, CWE-99]
 *  2018.08.17   ?좎슜??     filePathBlackList ?섏젙
 *  2018.10.10   ?좎슜??     . => \\.?쇰줈 ?섏젙
 *  2022.05.10   ?뺤쭊??     clearXSS() 硫붿냼??異붽?
 *  2022.06.09   源?ν븯      NSR 蹂댁븞議곗튂 (removeOSCmdRisk ?⑥닔???덈룄???ㅼ쨷 紐낅졊 ?ㅽ뻾 ?ㅼ썙??異붽?)
 *  2023.08.10   ?좎슜??     removeLDAPInjectionRisk() ?ㅻ쪟 ?섏젙
 *  2024.12.04   ?좎슜??     filePathBlackList() basePath 異붽?
 * </pre>
 */

public class EgovWebUtil {
	public static String clearXSSMinimum(String value) {
		if (value == null || value.trim().equals("")) {
			return "";
		}

		String returnValue = value;

		returnValue = returnValue.replaceAll("&", "&amp;");
		returnValue = returnValue.replaceAll("<", "&lt;");
		returnValue = returnValue.replaceAll(">", "&gt;");
		returnValue = returnValue.replaceAll("\"", "&#34;");
		returnValue = returnValue.replaceAll("\'", "&#39;");
		returnValue = returnValue.replaceAll("\\.", "&#46;");
		returnValue = returnValue.replaceAll("%2E", "&#46;");
		returnValue = returnValue.replaceAll("%2F", "&#47;");
		return returnValue;
	}

	public static String clearXSSMaximum(String value) {
		String returnValue = value;
		returnValue = clearXSSMinimum(returnValue);

		returnValue = returnValue.replaceAll("%00", null);

		returnValue = returnValue.replaceAll("%", "&#37;");

		// \\. => .

		returnValue = returnValue.replaceAll("\\.\\./", ""); // ../
		returnValue = returnValue.replaceAll("\\.\\.\\\\", ""); // ..\
		returnValue = returnValue.replaceAll("\\./", ""); // ./
		returnValue = returnValue.replaceAll("%2F", "");

		return returnValue;
	}

	public static String clearXSS(String value) {
		if (value == null || value.trim().equals("")) {
			return "";
		}

		String returnValue = value;
		returnValue = returnValue.replaceAll("&", "&amp;");
		returnValue = returnValue.replaceAll("%2E", "&#46;");
		returnValue = returnValue.replaceAll("%2F", "&#47;");
		returnValue = returnValue.replaceAll("<", "&lt;");
		returnValue = returnValue.replaceAll(">", "&gt;");
		returnValue = returnValue.replaceAll("%3C", "&lt;");
		returnValue = returnValue.replaceAll("%3E", "&gt;");

		return returnValue;
	}

	public static String filePathBlackList(String value) {
		String returnValue = value;
		if (returnValue == null || returnValue.trim().equals("")) {
			return "";
		}

		returnValue = returnValue.replaceAll("\\.\\.", "");

		return returnValue;
	}

	/**
	 * ?뚯씪寃쎈줈 蹂댁븞痍⑥빟??議곗튂
	 * # 二쇱쓽?ы빆
	 * 1. basePath??諛섎뱶??吏?뺥빐???쒕떎.
	 * 2. basePath??ROOT Path "/" ?ъ슜 湲덉? ?쒕떎.
	 * 3. basePath ?섏쐞 ?붾젆?좊━???낅줈?쒗븳 ?뚯씪??議댁옱?섎룄濡?援ъ꽦?섎ŉ 以묒슂?뚯씪??議댁옱?섏? ?딅룄濡?愿由ы븳??
	 *
	 * @param value ?뚯씪紐?
	 * @param basePath 湲곕낯 寃쎈줈
	 * @return
	 */
	public static String filePathBlackList(String value, String basePath) {
		if ( basePath == null || "".equals(basePath) ) {
			throw new SecurityException("base path is empty.");
		}
		if ( File.separator.equals(basePath) || "/".equals(basePath) ) {
			throw new SecurityException("base path does not allow Root.");
		}
		return filePathBlackList(basePath + value);
	}

	/**
	 * ?됱븞遺 蹂댁븞痍⑥빟???먭? 議곗튂 諛⑹븞.
	 *
	 * @param value
	 * @return
	 */
	public static String filePathReplaceAll(String value) {
		String returnValue = value;
		if (returnValue == null || returnValue.trim().equals("")) {
			return "";
		}

		returnValue = returnValue.replaceAll("/", "");
		returnValue = returnValue.replaceAll("\\\\", "");
		returnValue = returnValue.replaceAll("\\.\\.", ""); // ..
		returnValue = returnValue.replaceAll("&", "");

		return returnValue;
	}

	public static String fileInjectPathReplaceAll(String value) {
		String returnValue = value;
		if (returnValue == null || returnValue.trim().equals("")) {
			return "";
		}

		returnValue = returnValue.replaceAll("/", "");
		returnValue = returnValue.replaceAll("\\..", ""); // ..
		returnValue = returnValue.replaceAll("\\\\", "");// \
		returnValue = returnValue.replaceAll("&", "");

		return returnValue;
	}

	public static boolean isIPAddress(String str) {
		Pattern ipPattern = Pattern.compile("\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}");

		return ipPattern.matcher(str).matches();
	}

	public static String removeCRLF(String parameter) {
		return parameter.replaceAll("\r", "").replaceAll("\n", "");
	}

	public static String removeSQLInjectionRisk(String parameter) {
		return parameter.replaceAll("\\p{Space}", "").replaceAll("\\*", "").replaceAll("%", "").replaceAll(";", "")
			.replaceAll("-", "").replaceAll("\\+", "").replaceAll(",", "");
	}

	public static String removeOSCmdRisk(String parameter) {
		return parameter.replaceAll("\\p{Space}", "").replaceAll("\\*", "").replaceAll("\\|", "").replaceAll(";", "").replaceAll("&", "");
	}

	/**
	 * LDAP ?뚮씪誘명꽣?먯꽌 ?뱀닔臾몄옄 ?쒓굅.
	 * ?뚮씪誘명꽣 蹂꾨줈 ?쒓굅瑜??댁빞 ??
	 * ?쇨큵 ?곌껐???뚮씪誘명꽣?ㅼ? ?곕줈 泥섎━?댁빞 ??
	 * TODO : LDAP Injection Prevent 濡쒖쭅 異붽? ?꾩슂
	 * @param value
	 * @return
	 */
	public static String removeLDAPInjectionRisk(String value) {

		String returnValue = value;
		if (returnValue == null || returnValue.trim().equals("")) {
			return "";
		}

		/*紐⑤뱺 ?뱀닔臾몄옄 ?쒓굅*/
//		String match = "[^\uAC00-\uD7A30-9a-zA-Z]";//?뱀닔臾몄옄 = ?쒓?,?レ옄,?곷Ц ?쒖쇅
//		returnValue = returnValue.replaceAll(match, "");

		/*?뱀닔臾몄옄 ?좏깮???쒓굅*/
		returnValue = returnValue.replaceAll("\\*", "");
		returnValue = returnValue.replaceAll("&", "");
		returnValue = returnValue.replaceAll("\\|", "");
		returnValue = returnValue.replaceAll("//", "");
		returnValue = returnValue.replaceAll("%", "");
		returnValue = returnValue.replaceAll("\\(", "");
		returnValue = returnValue.replaceAll("\\)", "");
		returnValue = returnValue.replaceAll("\\\\", "");
		//...
		//媛쒕퀎濡??꾩슂????ぉ??異붽? ?꾩슂

		return returnValue;
	}

}
