/**
 * @Class Name  : EgovStringUtil.java
 * @Description : 臾몄옄???곗씠??泥섎━ 愿???좏떥由ы떚
 * @Modification Information
 *
 *     ?섏젙??        ?섏젙??                  ?섏젙?댁슜
 *     -------          --------        ---------------------------
 *   2009.01.13     諛뺤젙洹?         理쒖큹 ?앹꽦
 *   2009.02.13     ?댁궪??         ?댁슜 異붽?
 *   2024.10.29		Chung10Kr		紐낆궗??留욌뒗 議곗궗 諛섑솚 湲곕뒫 媛쒕컻
 *
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? 諛뺤젙洹?
 * @since 2009. 01. 13
 * @version 1.0
 * @see
 *
 */

package egovframework.com.utl.fcc.service;

/*
 * Copyright 2001-2006 The Apache Software Foundation.
 *
 * Licensed under the Apache License, Version 2.0 (the ";License&quot;);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS"; BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import java.io.UnsupportedEncodingException;
import java.math.BigDecimal;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.text.SimpleDateFormat;
import java.util.Locale;

public class EgovStringUtil {
	/**
	 * 鍮?臾몄옄??<code>""</code>.
	 */
	public static final String EMPTY = "";

	// 221116	源?쒖?	2022 ?쒗걧?댁퐫??議곗튂
	private static SecureRandom rnd = new SecureRandom();

	/**
	 * <p>Padding???????덈뒗 理쒕? ?섏튂</p>
	 */
	// private static final int PAD_LIMIT = 8192;

	/**
	 * <p>An array of <code>String</code>s used for padding.</p>
	 * <p>Used for efficient space padding. The length of each String expands as needed.</p>
	 */
	/*
	private static final String[] PADDING = new String[Character.MAX_VALUE];

	static {
		// space padding is most common, start with 64 chars
		PADDING[32] = "                                                                ";
	}
	 */

	/**
	 * 臾몄옄?댁씠 吏?뺥븳 湲몄씠瑜?珥덇낵?덉쓣??吏?뺥븳湲몄씠?먮떎媛 ?대떦 臾몄옄?댁쓣 遺숈뿬二쇰뒗 硫붿꽌??
	 * @param source ?먮낯 臾몄옄??諛곗뿴
	 * @param output ?뷀븷臾몄옄??
	 * @param slength 吏?뺢만??
	 * @return 吏?뺢만?대줈 ?섎씪???뷀븷遺꾩옄???⑹튇 臾몄옄??
	 */
	public static String cutString(String source, String output, int slength) {
		String returnVal = null;
		if (source != null) {
			if (source.length() > slength) {
				returnVal = source.substring(0, slength) + output;
			} else {
				returnVal = source;
			}
		}
		return returnVal;
	}

	/**
	 * 臾몄옄?댁씠 吏?뺥븳 湲몄씠瑜?珥덇낵?덉쓣???대떦 臾몄옄?댁쓣 ??젣?섎뒗 硫붿꽌??
	 * @param source ?먮낯 臾몄옄??諛곗뿴
	 * @param slength 吏?뺢만??
	 * @return 吏?뺢만?대줈 ?섎씪???뷀븷遺꾩옄???⑹튇 臾몄옄??
	 */
	public static String cutString(String source, int slength) {
		String result = null;
		if (source != null) {
			if (source.length() > slength) {
				result = source.substring(0, slength);
			} else {
				result = source;
			}
		}
		return result;
	}

	/**
	 * <p>
	 * String??鍮꾩뿀嫄곕굹("") ?뱀? null ?몄? 寃利앺븳??
	 * </p>
	 *
	 * <pre>
	 *  StringUtil.isEmpty(null)      = true
	 *  StringUtil.isEmpty("")        = true
	 *  StringUtil.isEmpty(" ")       = false
	 *  StringUtil.isEmpty("bob")     = false
	 *  StringUtil.isEmpty("  bob  ") = false
	 * </pre>
	 *
	 * @param str - 泥댄겕 ????ㅽ듃留곸삤釉뚯젥?몄씠硫?null???덉슜??
	 * @return <code>true</code> - ?낅젰諛쏆? String ??鍮?臾몄옄???먮뒗 null??寃쎌슦
	 */
	public static boolean isEmpty(String str) {
		return str == null || str.length() == 0;
	}

	/**
	 * <p>湲곗? 臾몄옄?댁뿉 ?ы븿??紐⑤뱺 ???臾몄옄(char)瑜??쒓굅?쒕떎.</p>
	 *
	 * <pre>
	 * StringUtil.remove(null, *)       = null
	 * StringUtil.remove("", *)         = ""
	 * StringUtil.remove("queued", 'u') = "qeed"
	 * StringUtil.remove("queued", 'z') = "queued"
	 * </pre>
	 *
	 * @param str  ?낅젰諛쏅뒗 湲곗? 臾몄옄??
	 * @param remove  ?낅젰諛쏅뒗 臾몄옄?댁뿉???쒓굅?????臾몄옄??
	 * @return ?쒓굅???臾몄옄?댁씠 ?쒓굅???낅젰臾몄옄?? ?낅젰臾몄옄?댁씠 null??寃쎌슦 異쒕젰臾몄옄?댁? null
	 */
	public static String remove(String str, char remove) {
		if (isEmpty(str) || str.indexOf(remove) == -1) {
			return str;
		}
		char[] chars = str.toCharArray();
		int pos = 0;
		for (int i = 0; i < chars.length; i++) {
			if (chars[i] != remove) {
				chars[pos++] = chars[i];
			}
		}
		return new String(chars, 0, pos);
	}

	/**
	 * <p>臾몄옄???대???肄ㅻ쭏 character(,)瑜?紐⑤몢 ?쒓굅?쒕떎.</p>
	 *
	 * <pre>
	 * StringUtil.removeCommaChar(null)       = null
	 * StringUtil.removeCommaChar("")         = ""
	 * StringUtil.removeCommaChar("asdfg,qweqe") = "asdfgqweqe"
	 * </pre>
	 *
	 * @param str ?낅젰諛쏅뒗 湲곗? 臾몄옄??
	 * @return " , "媛 ?쒓굅???낅젰臾몄옄??
	 *  ?낅젰臾몄옄?댁씠 null??寃쎌슦 異쒕젰臾몄옄?댁? null
	 */
	public static String removeCommaChar(String str) {
		return remove(str, ',');
	}

	/**
	 * <p>臾몄옄???대???留덉씠?덉뒪 character(-)瑜?紐⑤몢 ?쒓굅?쒕떎.</p>
	 *
	 * <pre>
	 * StringUtil.removeMinusChar(null)       = null
	 * StringUtil.removeMinusChar("")         = ""
	 * StringUtil.removeMinusChar("a-sdfg-qweqe") = "asdfgqweqe"
	 * </pre>
	 *
	 * @param str  ?낅젰諛쏅뒗 湲곗? 臾몄옄??
	 * @return " - "媛 ?쒓굅???낅젰臾몄옄??
	 *  ?낅젰臾몄옄?댁씠 null??寃쎌슦 異쒕젰臾몄옄?댁? null
	 */
	public static String removeMinusChar(String str) {
		return remove(str, '-');
	}

	/**
	 * ?먮낯 臾몄옄?댁쓽 ?ы븿???뱀젙 臾몄옄?댁쓣 ?덈줈??臾몄옄?대줈 蹂?섑븯??硫붿꽌??
	 * @param source ?먮낯 臾몄옄??
	 * @param subject ?먮낯 臾몄옄?댁뿉 ?ы븿???뱀젙 臾몄옄??
	 * @param object 蹂?섑븷 臾몄옄??
	 * @return sb.toString() ?덈줈??臾몄옄?대줈 蹂?섎맂 臾몄옄??
	 */
	public static String replace(String source, String subject, String object) {
		StringBuffer rtnStr = new StringBuffer();
		String preStr = "";
		String nextStr = source;
		String srcStr = source;

		while (srcStr.indexOf(subject) >= 0) {
			preStr = srcStr.substring(0, srcStr.indexOf(subject));
			nextStr = srcStr.substring(srcStr.indexOf(subject) + subject.length(), srcStr.length());
			srcStr = nextStr;
			rtnStr.append(preStr).append(object);
		}
		rtnStr.append(nextStr);

		return rtnStr.toString();
	}

	/**
	 * ?먮낯 臾몄옄?댁쓽 ?ы븿???뱀젙 臾몄옄??泥ル쾲吏??쒓컻留??덈줈??臾몄옄?대줈 蹂?섑븯??硫붿꽌??
	 * @param source ?먮낯 臾몄옄??
	 * @param subject ?먮낯 臾몄옄?댁뿉 ?ы븿???뱀젙 臾몄옄??
	 * @param object 蹂?섑븷 臾몄옄??
	 * @return sb.toString() ?덈줈??臾몄옄?대줈 蹂?섎맂 臾몄옄??/ source ?뱀젙臾몄옄?댁씠 ?녿뒗 寃쎌슦 ?먮낯 臾몄옄??
	 */
	public static String replaceOnce(String source, String subject, String object) {
		StringBuffer rtnStr = new StringBuffer();
		String preStr = "";
		String nextStr = source;
		if (source.indexOf(subject) >= 0) {
			preStr = source.substring(0, source.indexOf(subject));
			nextStr = source.substring(source.indexOf(subject) + subject.length(), source.length());
			rtnStr.append(preStr).append(object).append(nextStr);

			return rtnStr.toString();
		} else {
			return source;
		}
	}

	/**
	 * <code>subject</code>???ы븿??媛곴컖??臾몄옄瑜?object濡?蹂?섑븳??
	 *
	 * @param source ?먮낯 臾몄옄??
	 * @param subject ?먮낯 臾몄옄?댁뿉 ?ы븿???뱀젙 臾몄옄??
	 * @param object 蹂?섑븷 臾몄옄??
	 * @return sb.toString() ?덈줈??臾몄옄?대줈 蹂?섎맂 臾몄옄??
	 */
	public static String replaceChar(String source, String subject, String object) {
		StringBuffer rtnStr = new StringBuffer();
		String preStr = "";
		String nextStr = source;
		String srcStr = source;

		char chA;

		for (int i = 0; i < subject.length(); i++) {
			chA = subject.charAt(i);

			if (srcStr.indexOf(chA) >= 0) {
				preStr = srcStr.substring(0, srcStr.indexOf(chA));
				nextStr = srcStr.substring(srcStr.indexOf(chA) + 1, srcStr.length());
				srcStr = rtnStr.append(preStr).append(object).append(nextStr).toString();
			}
		}

		return srcStr;
	}

	/**
	 * <p><code>str</code> 以?<code>searchStr</code>???쒖옉(index) ?꾩튂瑜?諛섑솚.</p>
	 *
	 * <p>?낅젰媛?以?<code>null</code>???덉쓣 寃쎌슦 <code>-1</code>??諛섑솚.</p>
	 *
	 * <pre>
	 * StringUtil.indexOf(null, *)          = -1
	 * StringUtil.indexOf(*, null)          = -1
	 * StringUtil.indexOf("", "")           = 0
	 * StringUtil.indexOf("aabaabaa", "a")  = 0
	 * StringUtil.indexOf("aabaabaa", "b")  = 2
	 * StringUtil.indexOf("aabaabaa", "ab") = 1
	 * StringUtil.indexOf("aabaabaa", "")   = 0
	 * </pre>
	 *
	 * @param str  寃??臾몄옄??
	 * @param searchStr  寃????곷Ц?먯뿴
	 * @return 寃??臾몄옄??以?寃????곷Ц?먯뿴???덈뒗 ?쒖옉 ?꾩튂 寃?됰???臾몄옄?댁씠 ?녾굅??null??寃쎌슦 -1
	 */
	public static int indexOf(String str, String searchStr) {
		if (str == null || searchStr == null) {
			return -1;
		}

		return str.indexOf(searchStr);
	}

	/**
	 * <p>?ㅻ씪?댁쓽 decode ?⑥닔? ?숈씪??湲곕뒫??媛吏?硫붿꽌?쒖씠??
	 * <code>sourStr</code>怨?<code>compareStr</code>??媛믪씠 媛숈쑝硫?
	 * <code>returStr</code>??諛섑솚?섎ŉ, ?ㅻⅤ硫? <code>defaultStr</code>??諛섑솚?쒕떎.
	 * </p>
	 *
	 * <pre>
	 * StringUtil.decode(null, null, "foo", "bar")= "foo"
	 * StringUtil.decode("", null, "foo", "bar") = "bar"
	 * StringUtil.decode(null, "", "foo", "bar") = "bar"
	 * StringUtil.decode("?섏씠", "?섏씠", null, "bar") = null
	 * StringUtil.decode("?섏씠", "?섏씠  ", "foo", null) = null
	 * StringUtil.decode("?섏씠", "?섏씠", "foo", "bar") = "foo"
	 * StringUtil.decode("?섏씠", "?섏씠  ", "foo", "bar") = "bar"
	 * </pre>
	 *
	 * @param sourceStr 鍮꾧탳??臾몄옄??
	 * @param compareStr 鍮꾧탳 ???臾몄옄??
	 * @param returnStr sourceStr? compareStr??媛믪씠 媛숈쓣 ??諛섑솚??臾몄옄??
	 * @param defaultStr sourceStr? compareStr??媛믪씠 ?ㅻ? ??諛섑솚??臾몄옄??
	 * @return sourceStr怨?compareStr??媛믪씠 ?숈씪(equal)????returnStr??諛섑솚?섎ŉ,
	 *         <br/>?ㅻⅤ硫?defaultStr??諛섑솚?쒕떎.
	 */
	public static String decode(String sourceStr, String compareStr, String returnStr, String defaultStr) {
		//		if (sourceStr == null && compareStr == null) {
		//			return returnStr;
		//		}
		//
		//		if (sourceStr == null && compareStr != null) {
		//			return defaultStr;
		//		}
		//
		//		if (sourceStr.trim().equals(compareStr)) {
		//			return returnStr;
		//		}

		if (sourceStr == null) { //2022.01. Possible null pointer dereference
			if (compareStr == null) {
				return returnStr;
			} else {
				return defaultStr;
			}
		} else {
			if (sourceStr.trim().equals(compareStr)) {
				return returnStr;
			}
		}

		return defaultStr;
	}

	/**
	 * <p>?ㅻ씪?댁쓽 decode ?⑥닔? ?숈씪??湲곕뒫??媛吏?硫붿꽌?쒖씠??
	 * <code>sourStr</code>怨?<code>compareStr</code>??媛믪씠 媛숈쑝硫?
	 * <code>returStr</code>??諛섑솚?섎ŉ, ?ㅻⅤ硫? <code>sourceStr</code>??諛섑솚?쒕떎.
	 * </p>
	 *
	 * <pre>
	 * StringUtil.decode(null, null, "foo") = "foo"
	 * StringUtil.decode("", null, "foo") = ""
	 * StringUtil.decode(null, "", "foo") = null
	 * StringUtil.decode("?섏씠", "?섏씠", "foo") = "foo"
	 * StringUtil.decode("?섏씠", "?섏씠 ", "foo") = "?섏씠"
	 * StringUtil.decode("?섏씠", "諛붿씠", "foo") = "?섏씠"
	 * </pre>
	 *
	 * @param sourceStr 鍮꾧탳??臾몄옄??
	 * @param compareStr 鍮꾧탳 ???臾몄옄??
	 * @param returnStr sourceStr? compareStr??媛믪씠 媛숈쓣 ??諛섑솚??臾몄옄??
	 * @return sourceStr怨?compareStr??媛믪씠 ?숈씪(equal)????returnStr??諛섑솚?섎ŉ,
	 *         <br/>?ㅻⅤ硫?sourceStr??諛섑솚?쒕떎.
	 */
	public static String decode(String sourceStr, String compareStr, String returnStr) {
		return decode(sourceStr, compareStr, returnStr, sourceStr);
	}

	/**
	 * 媛앹껜媛 null?몄? ?뺤씤?섍퀬 null??寃쎌슦 "" 濡?諛붽씀??硫붿꽌??
	 * @param object ?먮낯 媛앹껜
	 * @return resultVal 臾몄옄??
	 */
	public static String isNullToString(Object object) {
		String string = "";

		if (object != null) {
			string = object.toString().trim();
		}

		return string;
	}

	/**
	 *<pre>
	 * ?몄옄濡?諛쏆? String??null??寃쎌슦 &quot;&quot;濡?由ы꽩?쒕떎.
	 * &#064;param src null媛믪씪 媛?μ꽦???덈뒗 String 媛?
	 * &#064;return 留뚯빟 String??null 媛믪씪 寃쎌슦 &quot;&quot;濡?諛붽씔 String 媛?
	 *</pre>
	 */
	public static String nullConvert(Object src) {
		//if (src != null && src.getClass().getName().equals("java.math.BigDecimal")) {
		if (src != null && src instanceof java.math.BigDecimal) {
			return ((BigDecimal)src).toString();
		}

		if (src == null || src.equals("null")) {
			return "";
		} else {
			return ((String)src).trim();
		}
	}

	/**
	 *<pre>
	 * ?몄옄濡?諛쏆? String??null??寃쎌슦 &quot;&quot;濡?由ы꽩?쒕떎.
	 * &#064;param src null媛믪씪 媛?μ꽦???덈뒗 String 媛?
	 * &#064;return 留뚯빟 String??null 媛믪씪 寃쎌슦 &quot;&quot;濡?諛붽씔 String 媛?
	 *</pre>
	 */
	public static String nullConvertInt(Object src) {
		//if (src != null && src.getClass().getName().equals("java.math.BigDecimal")) {
		if (src != null && src instanceof java.math.BigDecimal) {
			return ((BigDecimal)src).toString();
		}

		if (src == null || src.equals("null")) {
			return "0";
		} else {
			return ((String)src).trim();
		}
	}

	/**
	 *<pre>
	 * ?몄옄濡?諛쏆? String??null??寃쎌슦 &quot;&quot;濡?由ы꽩?쒕떎.
	 * &#064;param src null媛믪씪 媛?μ꽦???덈뒗 String 媛?
	 * &#064;return 留뚯빟 String??null 媛믪씪 寃쎌슦 &quot;&quot;濡?諛붽씔 String 媛?
	 *</pre>
	 */
	public static String nullConvert(String src) {

		if (src == null || src.equals("null") || "".equals(src) || " ".equals(src)) {
			return "";
		} else {
			return src.trim();
		}
	}

	/**
	 *<pre>
	 * ?몄옄濡?諛쏆? String??null??寃쎌슦 &quot;0&quot;濡?由ы꽩?쒕떎.
	 * &#064;param src null媛믪씪 媛?μ꽦???덈뒗 String 媛?
	 * &#064;return 留뚯빟 String??null 媛믪씪 寃쎌슦 &quot;0&quot;濡?諛붽씔 String 媛?
	 *</pre>
	 */
	public static int zeroConvert(Object src) {

		if (src == null || src.equals("null")) {
			return 0;
		} else {
			return Integer.parseInt(((String)src).trim());
		}
	}

	/**
	 *<pre>
	 * ?몄옄濡?諛쏆? String??null??寃쎌슦 &quot;&quot;濡?由ы꽩?쒕떎.
	 * &#064;param src null媛믪씪 媛?μ꽦???덈뒗 String 媛?
	 * &#064;return 留뚯빟 String??null 媛믪씪 寃쎌슦 &quot;&quot;濡?諛붽씔 String 媛?
	 *</pre>
	 */
	public static int zeroConvert(String src) {

		if (src == null || src.equals("null") || "".equals(src) || " ".equals(src)) {
			return 0;
		} else {
			return Integer.parseInt(src.trim());
		}
	}

	/**
	 * <p>臾몄옄?댁뿉??{@link Character#isWhitespace(char)}???뺤쓽??
	 * 紐⑤뱺 怨듬갚臾몄옄瑜??쒓굅?쒕떎.</p>
	 *
	 * <pre>
	 * StringUtil.removeWhitespace(null)         = null
	 * StringUtil.removeWhitespace("")           = ""
	 * StringUtil.removeWhitespace("abc")        = "abc"
	 * StringUtil.removeWhitespace("   ab  c  ") = "abc"
	 * </pre>
	 *
	 * @param str  怨듬갚臾몄옄媛 ?쒓굅?꾩뼱????臾몄옄??
	 * @return the 怨듬갚臾몄옄媛 ?쒓굅??臾몄옄?? null???낅젰?섎㈃ <code>null</code>??由ы꽩
	 */
	public static String removeWhitespace(String str) {
		if (isEmpty(str)) {
			return str;
		}
		int sz = str.length();
		char[] chs = new char[sz];
		int count = 0;
		for (int i = 0; i < sz; i++) {
			if (!Character.isWhitespace(str.charAt(i))) {
				chs[count++] = str.charAt(i);
			}
		}
		if (count == sz) {
			return str;
		}

		return new String(chs, 0, count);
	}

	/**
	 * Html 肄붾뱶媛 ?ㅼ뼱媛?臾몄꽌瑜??쒖떆?좊븣 ?쒓렇???먯긽?놁씠 蹂댁씠湲??꾪븳 硫붿꽌??
	 *
	 * @param strString
	 * @return HTML ?쒓렇瑜?移섑솚??臾몄옄??
	 */
	public static String checkHtmlView(String strString) {
		String strNew = "";

		StringBuffer strTxt = new StringBuffer("");

		char chrBuff;
		int len = strString.length();

		for (int i = 0; i < len; i++) {
			chrBuff = strString.charAt(i);

			switch (chrBuff) {
				case '<':
					strTxt.append("&lt;");
					break;
				case '>':
					strTxt.append("&gt;");
					break;
				case '"':
					strTxt.append("&quot;");
					break;
				case 10:
					strTxt.append("<br>");
					break;
				case ' ':
					strTxt.append("&nbsp;");
					break;
				//case '&' :
				//strTxt.append("&amp;");
				//break;
				default:
					strTxt.append(chrBuff);
			}
		}

		strNew = strTxt.toString();

		return strNew;
	}

	/**
	 * 臾몄옄?댁쓣 吏?뺥븳 遺꾨━?먯뿉 ?섑빐 諛곗뿴濡?由ы꽩?섎뒗 硫붿꽌??
	 * @param source ?먮낯 臾몄옄??
	 * @param separator 遺꾨━??
	 * @return result 遺꾨━?먮줈 ?섎돇?댁쭊 臾몄옄??諛곗뿴
	 */
	public static String[] split(String source, String separator) throws NullPointerException {
		String[] returnVal = null;
		int cnt = 1;

		int index = source.indexOf(separator);
		int index0 = 0;
		while (index >= 0) {
			cnt++;
			index = source.indexOf(separator, index + 1);
		}
		returnVal = new String[cnt];
		cnt = 0;
		index = source.indexOf(separator);
		while (index >= 0) {
			returnVal[cnt] = source.substring(index0, index);
			index0 = index + 1;
			index = source.indexOf(separator, index + 1);
			cnt++;
		}
		returnVal[cnt] = source.substring(index0);

		return returnVal;
	}

	/**
	 * <p>{@link String#toLowerCase()}瑜??댁슜?섏뿬 ?뚮Ц?먮줈 蹂?섑븳??</p>
	 *
	 * <pre>
	 * StringUtil.lowerCase(null)  = null
	 * StringUtil.lowerCase("")    = ""
	 * StringUtil.lowerCase("aBc") = "abc"
	 * </pre>
	 *
	 * @param str ?뚮Ц?먮줈 蹂?섎릺?댁빞 ??臾몄옄??
	 * @return ?뚮Ц?먮줈 蹂?섎맂 臾몄옄?? null???낅젰?섎㈃ <code>null</code> 由ы꽩
	 */
	public static String lowerCase(String str) {
		if (str == null) {
			return null;
		}

		return str.toLowerCase();
	}

	/**
	 * <p>{@link String#toUpperCase()}瑜??댁슜?섏뿬 ?臾몄옄濡?蹂?섑븳??</p>
	 *
	 * <pre>
	 * StringUtil.upperCase(null)  = null
	 * StringUtil.upperCase("")    = ""
	 * StringUtil.upperCase("aBc") = "ABC"
	 * </pre>
	 *
	 * @param str ?臾몄옄濡?蹂?섎릺?댁빞 ??臾몄옄??
	 * @return ?臾몄옄濡?蹂?섎맂 臾몄옄?? null???낅젰?섎㈃ <code>null</code> 由ы꽩
	 */
	public static String upperCase(String str) {
		if (str == null) {
			return null;
		}

		return str.toUpperCase();
	}

	/**
	 * <p>?낅젰??String???욎そ?먯꽌 ?먮쾲吏??몄옄濡??꾨떖??臾몄옄(stripChars)瑜?紐⑤몢 ?쒓굅?쒕떎.</p>
	 *
	 * <pre>
	 * StringUtil.stripStart(null, *)          = null
	 * StringUtil.stripStart("", *)            = ""
	 * StringUtil.stripStart("abc", "")        = "abc"
	 * StringUtil.stripStart("abc", null)      = "abc"
	 * StringUtil.stripStart("  abc", null)    = "abc"
	 * StringUtil.stripStart("abc  ", null)    = "abc  "
	 * StringUtil.stripStart(" abc ", null)    = "abc "
	 * StringUtil.stripStart("yxabc  ", "xyz") = "abc  "
	 * </pre>
	 *
	 * @param str 吏?뺣맂 臾몄옄媛 ?쒓굅?섏뼱????臾몄옄??
	 * @param stripChars ?쒓굅???臾몄옄??
	 * @return 吏?뺣맂 臾몄옄媛 ?쒓굅??臾몄옄?? null???낅젰?섎㈃ <code>null</code> 由ы꽩
	 */
	public static String stripStart(String str, String stripChars) {
		int strLen;
		if (str == null || (strLen = str.length()) == 0) {
			return str;
		}
		int start = 0;
		if (stripChars == null) {
			while ((start != strLen) && Character.isWhitespace(str.charAt(start))) {
				start++;
			}
		} else if (stripChars.length() == 0) {
			return str;
		} else {
			while ((start != strLen) && (stripChars.indexOf(str.charAt(start)) != -1)) {
				start++;
			}
		}

		return str.substring(start);
	}

	/**
	 * <p>?낅젰??String???ㅼそ?먯꽌 ?먮쾲吏??몄옄濡??꾨떖??臾몄옄(stripChars)瑜?紐⑤몢 ?쒓굅?쒕떎.</p>
	 *
	 * <pre>
	 * StringUtil.stripEnd(null, *)          = null
	 * StringUtil.stripEnd("", *)            = ""
	 * StringUtil.stripEnd("abc", "")        = "abc"
	 * StringUtil.stripEnd("abc", null)      = "abc"
	 * StringUtil.stripEnd("  abc", null)    = "  abc"
	 * StringUtil.stripEnd("abc  ", null)    = "abc"
	 * StringUtil.stripEnd(" abc ", null)    = " abc"
	 * StringUtil.stripEnd("  abcyx", "xyz") = "  abc"
	 * </pre>
	 *
	 * @param str 吏?뺣맂 臾몄옄媛 ?쒓굅?섏뼱????臾몄옄??
	 * @param stripChars ?쒓굅???臾몄옄??
	 * @return 吏?뺣맂 臾몄옄媛 ?쒓굅??臾몄옄?? null???낅젰?섎㈃ <code>null</code> 由ы꽩
	 */
	public static String stripEnd(String str, String stripChars) {
		int end;
		if (str == null || (end = str.length()) == 0) {
			return str;
		}

		if (stripChars == null) {
			while ((end != 0) && Character.isWhitespace(str.charAt(end - 1))) {
				end--;
			}
		} else if (stripChars.length() == 0) {
			return str;
		} else {
			while ((end != 0) && (stripChars.indexOf(str.charAt(end - 1)) != -1)) {
				end--;
			}
		}

		return str.substring(0, end);
	}

	/**
	 * <p>?낅젰??String???? ?ㅼ뿉???먮쾲吏??몄옄濡??꾨떖??臾몄옄(stripChars)瑜?紐⑤몢 ?쒓굅?쒕떎.</p>
	 *
	 * <pre>
	 * StringUtil.strip(null, *)          = null
	 * StringUtil.strip("", *)            = ""
	 * StringUtil.strip("abc", null)      = "abc"
	 * StringUtil.strip("  abc", null)    = "abc"
	 * StringUtil.strip("abc  ", null)    = "abc"
	 * StringUtil.strip(" abc ", null)    = "abc"
	 * StringUtil.strip("  abcyx", "xyz") = "  abc"
	 * </pre>
	 *
	 * @param str 吏?뺣맂 臾몄옄媛 ?쒓굅?섏뼱????臾몄옄??
	 * @param stripChars ?쒓굅???臾몄옄??
	 * @return 吏?뺣맂 臾몄옄媛 ?쒓굅??臾몄옄?? null???낅젰?섎㈃ <code>null</code> 由ы꽩
	 */
	public static String strip(String str, String stripChars) {
		if (isEmpty(str)) {
			return str;
		}

		String srcStr = str;
		srcStr = stripStart(srcStr, stripChars);

		return stripEnd(srcStr, stripChars);
	}

	/**
	 * 臾몄옄?댁쓣 吏?뺥븳 遺꾨━?먯뿉 ?섑빐 吏?뺣맂 湲몄씠??諛곗뿴濡?由ы꽩?섎뒗 硫붿꽌??
	 * @param source ?먮낯 臾몄옄??
	 * @param separator 遺꾨━??
	 * @param arraylength 諛곗뿴 湲몄씠
	 * @return 遺꾨━?먮줈 ?섎돇?댁쭊 臾몄옄??諛곗뿴
	 */
	public static String[] split(String source, String separator, int arraylength) throws NullPointerException {
		String[] returnVal = new String[arraylength];
		int cnt = 0;
		int index0 = 0;
		int index = source.indexOf(separator);
		while (index >= 0 && cnt < (arraylength - 1)) {
			returnVal[cnt] = source.substring(index0, index);
			index0 = index + 1;
			index = source.indexOf(separator, index + 1);
			cnt++;
		}
		returnVal[cnt] = source.substring(index0);
		if (cnt < (arraylength - 1)) {
			for (int i = cnt + 1; i < arraylength; i++) {
				returnVal[i] = "";
			}
		}

		return returnVal;
	}

	/**
	 * 臾몄옄??A?먯꽌 Z?ъ씠???쒕뜡 臾몄옄?댁쓣 援ы븯??湲곕뒫???쒓났 ?쒖옉臾몄옄?닿낵 醫낅즺臾몄옄???ъ씠???쒕뜡 臾몄옄?댁쓣 援ы븯??湲곕뒫
	 *
	 * @param startChr - 泥?臾몄옄
	 * @param endChr - 留덉?留됰Ц??
	 * @return ?쒕뜡臾몄옄
	 * @exception MyException
	 * @see
	 */
	public static String getRandomStr(char startChr, char endChr) {

		int randomInt;
		String randomStr = null;

		// ?쒖옉臾몄옄 諛?醫낅즺臾몄옄瑜??꾩뒪?ㅼ닽?먮줈 蹂?섑븳??
		int startInt = Integer.valueOf(startChr);
		int endInt = Integer.valueOf(endChr);

		// ?쒖옉臾몄옄?댁씠 醫낅즺臾몄옄?대낫媛 ?닿꼍??
		if (startInt > endInt) {
			throw new IllegalArgumentException("Start String: " + startChr + " End String: " + endChr);
		}

		do {
			// ?쒖옉臾몄옄 諛?醫낅즺臾몄옄 以묒뿉???쒕뜡 ?レ옄瑜?諛쒖깮?쒗궓??
			randomInt = rnd.nextInt(endInt + 1);
		} while (randomInt < startInt); // ?낅젰諛쏆? 臾몄옄 'A'(65)蹂대떎 ?묒쑝硫??ㅼ떆 ?쒕뜡 ?レ옄 諛쒖깮.

		// ?쒕뜡 ?レ옄瑜?臾몄옄濡?蹂?????ㅽ듃留곸쑝濡??ㅼ떆 蹂??
		randomStr = (char)randomInt + "";

		// ?쒕뜡臾몄옄?대? 由ы꽩
		return randomStr;
	}

	/**
	 * 臾몄옄?댁쓣 ?ㅼ뼇??臾몄옄??EUC-KR[KSC5601],UTF-8..)???ъ슜?섏뿬 ?몄퐫?⑺븯??湲곕뒫 ??쑝濡??붿퐫?⑺븯???먮옒??臾몄옄?댁쓣
	 * 蹂듭썝?섎뒗 湲곕뒫???쒓났??String temp = new String(臾몄옄??getBytes("諛붽씀湲곗쟾 ?몄퐫??),"諛붽? ?몄퐫??);
	 * String temp = new String(臾몄옄??getBytes("8859_1"),"KSC5601"); => UTF-8 ?먯꽌
	 * EUC-KR
	 *
	 * @param srcString - 臾몄옄??
	 * @param srcCharsetNm - ?먮옒 CharsetNm
	 * @param charsetNm - CharsetNm
	 * @return ????肄붾뵫 臾몄옄??
	 * @exception MyException
	 * @see
	 */
	public static String getEncdDcd(String srcString, String srcCharsetNm, String cnvrCharsetNm) {

		String rtnStr = null;

		if (srcString == null) {
			return null;
		}

		try {
			rtnStr = new String(srcString.getBytes(srcCharsetNm), cnvrCharsetNm);
		} catch (UnsupportedEncodingException e) {
			rtnStr = null;
		}

		return rtnStr;
	}

	/**
	     * ?뱀닔臾몄옄瑜???釉뚮씪?곗??먯꽌 ?뺤긽?곸쑝濡?蹂댁씠湲??꾪빐 ?뱀닔臾몄옄瑜?泥섎━('<' -> & lT)?섎뒗 湲곕뒫?대떎
	     * @param 	srcString 		- '<'
	     * @return 	蹂?섎Ц?먯뿴('<' -> "&lt"
	     * @exception MyException
	     * @see
	     */
	public static String getSpclStrCnvr(String srcString) {

		String rtnStr = null;

		StringBuffer strTxt = new StringBuffer("");

		char chrBuff;
		int len = srcString.length();

		for (int i = 0; i < len; i++) {
			chrBuff = srcString.charAt(i);

			switch (chrBuff) {
				case '<':
					strTxt.append("&lt;");
					break;
				case '>':
					strTxt.append("&gt;");
					break;
				case '&':
					strTxt.append("&amp;");
					break;
				default:
					strTxt.append(chrBuff);
			}
		}

		rtnStr = strTxt.toString();

		return rtnStr;
	}

	/**
	 * ?묒슜?댄뵆由ъ??댁뀡?먯꽌 怨좎쑀媛믪쓣 ?ъ슜?섍린 ?꾪빐 ?쒖뒪?쒖뿉??7?먮━?쁔IMESTAMP媛믪쓣 援ы븯??湲곕뒫
	 *
	 * @param
	 * @return Timestamp 媛?
	 * @exception MyException
	 * @see
	 */
	public static String getTimeStamp() {

		String rtnStr = null;

		// 臾몄옄?대줈 蹂?섑븯湲??꾪븳 ?⑦꽩 ?ㅼ젙(?곕룄-??????遺?珥?珥??먯젙?댄썑 珥?)
		String pattern = "yyyyMMddhhmmssSSS";

		SimpleDateFormat sdfCurrent = new SimpleDateFormat(pattern, Locale.KOREA);
		Timestamp ts = new Timestamp(System.currentTimeMillis());

		rtnStr = sdfCurrent.format(ts.getTime());

		return rtnStr;
	}

	/**
	 * html???뱀닔臾몄옄瑜??쒗쁽?섍린 ?꾪빐
	 *
	 * @param srcString
	 * @return String
	 * @exception Exception
	 * @see
	 */
	public static String getHtmlStrCnvr(String srcString) {

		String tmpString = srcString;

		tmpString = tmpString.replaceAll("&lt;", "<");
		tmpString = tmpString.replaceAll("&gt;", ">");
		tmpString = tmpString.replaceAll("&amp;", "&");
		tmpString = tmpString.replaceAll("&nbsp;", " ");
		tmpString = tmpString.replaceAll("&apos;", "\'");
		tmpString = tmpString.replaceAll("&quot;", "\"");

		return tmpString;

	}

	/**
	 * <p>?좎쭨 ?뺤떇??臾몄옄???대???留덉씠?덉뒪 character(-)瑜?異붽??쒕떎.</p>
	 *
	 * <pre>
	 *   StringUtil.addMinusChar("20100901") = "2010-09-01"
	 * </pre>
	 *
	 * @param date  ?낅젰諛쏅뒗 臾몄옄??
	 * @return " - "媛 異붽????낅젰臾몄옄??
	 */
	public static String addMinusChar(String date) {
		if (date.length() == 8) {
			return date.substring(0, 4).concat("-").concat(date.substring(4, 6)).concat("-")
				.concat(date.substring(6, 8));
		} else {
			return "";
		}
	}

	/**
	 * 二쇱뼱吏?紐낆궗??留욌뒗 蹂댁“?щ? 諛섑솚?쒕떎.
	 * ?? "?대쫫" -> "?대쫫?", "?섏씠" -> "?섏씠??
	 *
	 * @param noun 紐낆궗
	 * @return 蹂댁“??議곗궗 ("?" ?먮뒗 "??)
	 */
	public static String getAuxiliaryParticle(String noun){
		return noun+( hasFinalConsonant(noun) ? "?" : "??) ;
	}


	/**
	 * 二쇱뼱吏?紐낆궗??留욌뒗 二쇨꺽 議곗궗瑜?諛섑솚?쒕떎.
	 * ?? "梨낆긽" -> "梨낆긽??, "泥?냼湲? -> "泥?냼湲?
	 *
	 * @param noun 紐낆궗
	 * @return 二쇨꺽 議곗궗 ("?? ?먮뒗 "")
	 */
	public static String getSubjectParticle(String noun) {
		return hasFinalConsonant(noun) ? noun+"?? : noun;
	}



	/**
	 * 二쇱뼱吏?紐낆궗??留욌뒗 紐⑹쟻寃?議곗궗瑜?諛섑솚?쒕떎.
	 * ?? "梨낆긽" -> "梨낆긽??, "泥?냼湲? -> "泥?냼湲곕?"
	 *
	 * @param noun 紐낆궗
	 * @return 紐⑹쟻寃?議곗궗 ("?? ?먮뒗 "瑜?)
	 */
	public static String getObjectParticle(String noun) {
		return noun + (hasFinalConsonant(noun) ? "?? : "瑜?);
	}


	/**
	 * 二쇱뼱吏?紐낆궗媛 醫낆꽦??媛吏?붿? ?щ?瑜??뺤씤?쒕떎.
	 *
	 * @param noun 紐낆궗
	 * @return 醫낆꽦???덉쑝硫?true, ?놁쑝硫?false
	 */
	private static boolean hasFinalConsonant(String noun) {
		char lastChar = noun.charAt(noun.length() - 1);
		return (lastChar - 0xAC00) % 28 != 0;
	}
}
