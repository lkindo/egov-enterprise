package egovframework.com.cmm;

import java.io.File;
import java.util.regex.Pattern;

/**
 * ?? ????????????(??????????
 *
 * <pre>
 * << ?????Modification Information) >>
 *
 *  ????        ????    ????
 *  ----------   --------  ---------------------------
 *  2011.10.10   ????     ????
 *	2017-02-07   ????      ??????ES) - ???????????? ??[CWE-22, CWE-23, CWE-95, CWE-99]
 *  2018.08.17   ???     filePathBlackList ??
 *  2018.10.10   ???     . => \\.?? ??
 *  2022.05.10   ???     clearXSS() ?????
 *  2022.06.09   ??     NSR ? (removeOSCmdRisk ?????????? ??? ??????)
 *  2023.08.10   ???     removeLDAPInjectionRisk() ?? ??
 *  2024.12.04   ???     filePathBlackList() basePath ??
 * </pre>
 **/

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

		while (returnValue.contains("..")) {
			returnValue = returnValue.replace("..", "");
		}

		return returnValue;
	}

	/**
	 * ?????????
	 * # ????
	 * 1. basePath?????????.
	 * 2. basePath??ROOT Path "/" ????? ??.
	 * 3. basePath ?? ???????? ??????????????????????? ???????
	 *
	 * @param value ????
	 * @param basePath ???
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
	 * ??? ????? ???
	 *
	 * @param value
	 * @return
	 **/
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

	private static final Pattern IP_PATTERN = Pattern.compile("\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}");

	public static boolean isIPAddress(String str) {
		return IP_PATTERN.matcher(str).matches();
	}

	public static String removeCRLF(String parameter) {
		return parameter.replaceAll("\r", "").replaceAll("\n", "");
	}

	public static String removeSQLInjectionRisk(String parameter) {
		return parameter.replaceAll("\\p{Space}", "").replaceAll("\\*", "").replaceAll("%", "").replaceAll(";", "")
			.replaceAll("-", "").replaceAll("\\+", "").replaceAll(",", "");
	}

	public static String removeOSCmdRisk(String parameter) {
		if (parameter == null || parameter.trim().equals("")) {
			return "";
		}
		return parameter.replaceAll("[^a-zA-Z0-9\\.\\_\\-]", "");
	}

	/**
	 * LDAP ????? ?? ??.
	 * ??????????? ??
	 * ?? ????????? ? ??? ??
	 * @param value
	 * @return
	 **/
	public static String removeLDAPInjectionRisk(String value) {

		String returnValue = value;
		if (returnValue == null || returnValue.trim().equals("")) {
			return "";
		}

		/*??? ??*/
//		String match = "[^\uAC00-\uD7A30-9a-zA-Z]";//?? = ???,??,????
//		returnValue = returnValue.replaceAll(match, "");

		/*?? ?????*/
		returnValue = returnValue.replaceAll("\\*", "");
		returnValue = returnValue.replaceAll("&", "");
		returnValue = returnValue.replaceAll("\\|", "");
		returnValue = returnValue.replaceAll("//", "");
		returnValue = returnValue.replaceAll("%", "");
		returnValue = returnValue.replaceAll("\\(", "");
		returnValue = returnValue.replaceAll("\\)", "");
		returnValue = returnValue.replaceAll("\\\\", "");
		//...
		//???????????? ?

		return returnValue;
	}

}
