/**
 * @Class Name  : EgovStringUtil.java
 * @Description : ??????????????
 * @Modification Information
 *
 *     ????        ????                  ????
 *     -------          --------        ---------------------------
 *   2009.01.13     ??         ????
 *   2009.02.13     ????         ?? ??
 *   2024.10.29		Chung10Kr		??????????
 *
 * @author ????????? ??
 * @since 2009. 01. 13
 * @version 1.0
 * @see
 *
 **/

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
	 * ??????<code>""</code>.
	 **/
	public static final String EMPTY = "";

	// 221116	???	2022 ????????
	private static SecureRandom rnd = new SecureRandom();

	/**
	 * <p>Padding???????? ? ??</p>
	 **/
	// private static final int PAD_LIMIT = 8192;

	/**
	 * <p>An array of <code>String</code>s used for padding.</p>
	 * <p>Used for efficient space padding. The length of each String expands as needed.</p>
	 **/
	/*
	private static final String[] PADDING = new String[Character.MAX_VALUE];

	static {
		// space padding is most common, start with 64 chars
		PADDING[32] = "                                                                ";
	}
	 */

	/**
	 * ???? ? ???????????? ???????? ?? ??
	 * @param source ?? ?????
	 * @param output ???
	 * @param slength ????
	 * @return ?????????????? ????
	 **/
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
	 * ???? ? ???????????????? ????? ??
	 * @param source ?? ?????
	 * @param slength ????
	 * @return ?????????????? ????
	 **/
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
	 * String?????"") ?? null ?? ??
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
	 * @param str - ????????????null??????
	 * @return <code>true</code> - ??? String ?????????? null????
	 **/
	public static boolean isEmpty(String str) {
		return str == null || str.length() == 0;
	}

	/**
	 * <p>? ???? ????????????char)??????.</p>
	 *
	 * <pre>
	 * StringUtil.remove(null, *)       = null
	 * StringUtil.remove("", *)         = ""
	 * StringUtil.remove("queued", 'u') = "qeed"
	 * StringUtil.remove("queued", 'z') = "queued"
	 * </pre>
	 *
	 * @param str  ????? ????
	 * @param remove  ??????????????????????
	 * @return ?????????? ?????????? ?????? null????????? null
	 **/
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
	 * <p>???????????character(,)???????.</p>
	 *
	 * <pre>
	 * StringUtil.removeCommaChar(null)       = null
	 * StringUtil.removeCommaChar("")         = ""
	 * StringUtil.removeCommaChar("asdfg,qweqe") = "asdfgqweqe"
	 * </pre>
	 *
	 * @param str ????? ????
	 * @return " , " ??????????
	 *  ?????? null????????? null
	 **/
	public static String removeCommaChar(String str) {
		return remove(str, ',');
	}

	/**
	 * <p>???????????? character(-)???????.</p>
	 *
	 * <pre>
	 * StringUtil.removeMinusChar(null)       = null
	 * StringUtil.removeMinusChar("")         = ""
	 * StringUtil.removeMinusChar("a-sdfg-qweqe") = "asdfgqweqe"
	 * </pre>
	 *
	 * @param str  ????? ????
	 * @return " - " ??????????
	 *  ?????? null????????? null
	 **/
	public static String removeMinusChar(String str) {
		return remove(str, '-');
	}

	/**
	 * ?? ???? ??????????? ???????????????
	 * @param source ?? ????
	 * @param subject ?? ???? ???????????
	 * @param object ?? ????
	 * @return sb.toString() ??????????? ????
	 **/
	public static String replace(String source, String subject, String object) {
		return source.replace(subject, object == null ? "null" : object);
	}

	/**
	 * ?? ???? ??????????????????????????????
	 * @param source ?? ????
	 * @param subject ?? ???? ???????????
	 * @param object ?? ????
	 * @return sb.toString() ??????????? ???? source ?     ?               ??       ??                ???   ?    ?      ???   
	 */
	public static String replaceOnce(String source, String subject, String object) {
		StringBuilder rtnStr = new StringBuilder();
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
	 * <code>subject</code>???????????object?????
	 *
	 * @param source ?? ????
	 * @param subject ?? ???? ???????????
	 * @param object ?? ????
	 * @return sb.toString() ??????????? ????
	 **/
	public static String replaceChar(String source, String subject, String object) {
		StringBuilder rtnStr = new StringBuilder();
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
	 * <p><code>str</code> ?<code>searchStr</code>????(index) ?????</p>
	 *
	 * <p>????<code>null</code>???? ??<code>-1</code>????</p>
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
	 * @param str  ??????
	 * @param searchStr  ???????
	 * @return ?????????????????? ?? ? ????????? ????null????-1
	 **/
	public static int indexOf(String str, String searchStr) {
		if (str == null || searchStr == null) {
			return -1;
		}

		return str.indexOf(searchStr);
	}

	/**
	 * <p>???? decode ???? ????????????
	 * <code>sourStr</code>??<code>compareStr</code>???????
	 * <code>returStr</code>?????? ??? <code>defaultStr</code>?????.
	 * </p>
	 *
	 * <pre>
	 * StringUtil.decode(null, null, "foo", "bar")= "foo"
	 * StringUtil.decode("", null, "foo", "bar") = "bar"
	 * StringUtil.decode(null, "", "foo", "bar") = "bar"
	 * StringUtil.decode("??", "??", null, "bar") = null
	 * StringUtil.decode("??", "??  ", "foo", null) = null
	 * StringUtil.decode("??", "??", "foo", "bar") = "foo"
	 * StringUtil.decode("??", "??  ", "foo", "bar") = "bar"
	 * </pre>
	 *
	 * @param sourceStr ?????????
	 * @param compareStr ????????????
	 * @param returnStr sourceStr?? compareStr????????????????
	 * @param defaultStr sourceStr?? compareStr???????? ?????????
	 * @return sourceStr??compareStr???????(equal)????returnStr??????
	 *         <br/>???defaultStr?????.
	 **/
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
	 * <p>???? decode ???? ????????????
	 * <code>sourStr</code>??<code>compareStr</code>???????
	 * <code>returStr</code>?????? ??? <code>sourceStr</code>?????.
	 * </p>
	 *
	 * <pre>
	 * StringUtil.decode(null, null, "foo") = "foo"
	 * StringUtil.decode("", null, "foo") = ""
	 * StringUtil.decode(null, "", "foo") = null
	 * StringUtil.decode("??", "??", "foo") = "foo"
	 * StringUtil.decode("??", "?? ", "foo") = "??"
	 * StringUtil.decode("??", "??, "foo") = "??"
	 * </pre>
	 *
	 * @param sourceStr ?????????
	 * @param compareStr ????????????
	 * @param returnStr sourceStr?? compareStr????????????????
	 * @return sourceStr??compareStr???????(equal)????returnStr??????
	 *         <br/>???sourceStr?????.
	 **/
	public static String decode(String sourceStr, String compareStr, String returnStr) {
		return decode(sourceStr, compareStr, returnStr, sourceStr);
	}

	/**
	 * ? null?? ????null????"" ??????
	 * @param object ?? ?
	 * @return resultVal ????
	 **/
	public static String isNullToString(Object object) {
		String string = "";

		if (object != null) {
			string = object.toString().trim();
		}

		return string;
	}

	/**
	 *<pre>
	 * ??? String??null????&quot;&quot;????.
	 * &#064;param src null???????? String ?
	 * &#064;return ?String??null ?????&quot;&quot;???String ?
	 *</pre>
	 **/
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
	 * ??? String??null????&quot;&quot;????.
	 * &#064;param src null???????? String ?
	 * &#064;return ?String??null ?????&quot;&quot;???String ?
	 *</pre>
	 **/
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
	 * ??? String??null????&quot;&quot;????.
	 * &#064;param src null???????? String ?
	 * &#064;return ?String??null ?????&quot;&quot;???String ?
	 *</pre>
	 **/
	public static String nullConvert(String src) {

		if (src == null || src.equals("null") || "".equals(src) || " ".equals(src)) {
			return "";
		} else {
			return src.trim();
		}
	}

	/**
	 *<pre>
	 * ??? String??null????&quot;0&quot;????.
	 * &#064;param src null???????? String ?
	 * &#064;return ?String??null ?????&quot;0&quot;???String ?
	 *</pre>
	 **/
	public static int zeroConvert(Object src) {

		if (src == null || src.equals("null")) {
			return 0;
		} else {
			return Integer.parseInt(((String)src).trim());
		}
	}

	/**
	 *<pre>
	 * ??? String??null????&quot;&quot;????.
	 * &#064;param src null???????? String ?
	 * &#064;return ?String??null ?????&quot;&quot;???String ?
	 *</pre>
	 **/
	public static int zeroConvert(String src) {

		if (src == null || src.equals("null") || "".equals(src) || " ".equals(src)) {
			return 0;
		} else {
			return Integer.parseInt(src.trim());
		}
	}

	/**
	 * <p>??????{@link Character#isWhitespace(char)}?????
	 * ????????.</p>
	 *
	 * <pre>
	 * StringUtil.removeWhitespace(null)         = null
	 * StringUtil.removeWhitespace("")           = ""
	 * StringUtil.removeWhitespace("abc")        = "abc"
	 * StringUtil.removeWhitespace("   ab  c  ") = "abc"
	 * </pre>
	 *
	 * @param str  ? ???????????
	 * @return the ? ???????? null?????? <code>null</code>???
	 **/
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
	 * Html ?? ???????? ???????? ??? ??
	 *
	 * @param strString
	 * @return HTML ???????????
	 **/
	public static String checkHtmlView(String strString) {
		String strNew = "";

		StringBuilder strTxt = new StringBuilder("");

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
	 * ???? ? ???? ?? ???? ??
	 * @param source ?? ????
	 * @param separator ????
	 * @return result ???? ???? ?????
	 **/
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
	 * <p>{@link String#toLowerCase()}?????? ????? ????</p>
	 *
	 * <pre>
	 * StringUtil.lowerCase(null)  = null
	 * StringUtil.lowerCase("")    = ""
	 * StringUtil.lowerCase("aBc") = "abc"
	 * </pre>
	 *
	 * @param str ????? ???? ??????
	 * @return ????? ?? ???? null?????? <code>null</code> ?
	 **/
	public static String lowerCase(String str) {
		if (str == null) {
			return null;
		}

		return str.toLowerCase();
	}

	/**
	 * <p>{@link String#toUpperCase()}?????? ?????????</p>
	 *
	 * <pre>
	 * StringUtil.upperCase(null)  = null
	 * StringUtil.upperCase("")    = ""
	 * StringUtil.upperCase("aBc") = "ABC"
	 * </pre>
	 *
	 * @param str ????????? ??????
	 * @return ??????? ???? null?????? <code>null</code> ?
	 **/
	public static String upperCase(String str) {
		if (str == null) {
			return null;
		}

		return str.toUpperCase();
	}

	/**
	 * <p>????String?????? ???????????stripChars)???????.</p>
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
	 * @param str ? ??? ????????????
	 * @param stripChars ??????????
	 * @return ? ??? ???????? null?????? <code>null</code> ?
	 **/
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
	 * <p>????String?????? ???????????stripChars)???????.</p>
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
	 * @param str ? ??? ????????????
	 * @param stripChars ??????????
	 * @return ? ??? ???????? null?????? <code>null</code> ?
	 **/
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
	 * <p>????String???? ???????????????stripChars)???????.</p>
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
	 * @param str ? ??? ????????????
	 * @param stripChars ??????????
	 * @return ? ??? ???????? null?????? <code>null</code> ?
	 **/
	public static String strip(String str, String stripChars) {
		if (isEmpty(str)) {
			return str;
		}

		String srcStr = str;
		srcStr = stripStart(srcStr, stripChars);

		return stripEnd(srcStr, stripChars);
	}

	/**
	 * ???? ? ???? ?? ? ??????? ??
	 * @param source ?? ????
	 * @param separator ????
	 * @param arraylength ???
	 * @return ???? ???? ?????
	 **/
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
	 * ????A?? Z??????? ???? ???????? ?????? ?????????? ???? ?????
	 *
	 * @param startChr - ????
	 * @param endChr - ???
	 * @return ?????
	 * @exception MyException
	 * @see
	 **/
	public static String getRandomStr(char startChr, char endChr) {

		int randomInt;
		String randomStr = null;

		// ?????????????? ????
		int startInt = Integer.valueOf(startChr);
		int endInt = Integer.valueOf(endChr);

		// ?????? ????? ????
		if (startInt > endInt) {
			throw new IllegalArgumentException("Start String: " + startChr + " End String: " + endChr);
		}

		// ??????? ???? ????????
		randomInt = rnd.nextInt(endInt - startInt + 1) + startInt;

		// ?? ????????????????? ??
		randomStr = (char)randomInt + "";

		// ??????? ?
		return randomStr;
	}

	/**
	 * ???? ????????EUC-KR[KSC5601],UTF-8..)??????? ????????????????????????
	 * ??? ???????String temp = new String(????getBytes("??????),"? ???);
	 * String temp = new String(????getBytes("8859_1"),"KSC5601"); => UTF-8 ??
	 * EUC-KR
	 *
	 * @param srcString - ????
	 * @param srcCharsetNm - ?? CharsetNm
	 * @param charsetNm - CharsetNm
	 * @return ??????????
	 * @exception MyException
	 * @see
	 **/
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
	     * ???????????? ?????? ??????'<' -> & lT)?? ?????
	     * @param 	srcString 		- '<'
	     * @return 	????('<' -> "&lt"
	     * @exception MyException
	     * @see
	     **/
	public static String getSpclStrCnvr(String srcString) {

		String rtnStr = null;

		StringBuilder strTxt = new StringBuilder("");

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
	 * ????????? ?????????? ? ??????7????MESTAMP????????
	 *
	 * @param
	 * @return Timestamp ?
	 * @exception MyException
	 * @see
	 **/
	public static String getTimeStamp() {

		String rtnStr = null;

		// ????????? ??? ??(?-???????????????? ??)
		String pattern = "yyyyMMddhhmmssSSS";

		SimpleDateFormat sdfCurrent = new SimpleDateFormat(pattern, Locale.KOREA);
		Timestamp ts = new Timestamp(System.currentTimeMillis());

		rtnStr = sdfCurrent.format(ts.getTime());

		return rtnStr;
	}

	/**
	 * html?????????? ?
	 *
	 * @param srcString
	 * @return String
	 * @exception Exception
	 * @see
	 **/
	public static String getHtmlStrCnvr(String srcString) {

		String tmpString = srcString;

		tmpString = tmpString.replace("&lt;", "<");
		tmpString = tmpString.replace("&gt;", ">");
		tmpString = tmpString.replace("&amp;", "&");
		tmpString = tmpString.replace("&nbsp;", " ");
		tmpString = tmpString.replace("&apos;", "\'");
		tmpString = tmpString.replace("&quot;", "\"");

		return tmpString;

	}

	/**
	 * <p>?? ??????????????? character(-)??????.</p>
	 *
	 * <pre>
	 *   StringUtil.addMinusChar("20100901") = "2010-09-01"
	 * </pre>
	 *
	 * @param date  ????????
	 * @return " - " ??????????
	 **/
	public static String addMinusChar(String date) {
		if (date.length() == 8) {
			return date.substring(0, 4).concat("-").concat(date.substring(4, 6)).concat("-")
				.concat(date.substring(6, 8));
		} else {
			return "";
		}
	}

	/**
	 * ????????? ???.
	 * ?? "??? -> "????", "??" -> "????
	 *
	 * @param noun ?
	 * @return ????("??" ?? "??)
	 **/
	public static String getAuxiliaryParticle(String noun){
		return noun+( hasFinalConsonant(noun) ? "_1" : "_2") ;
	}


	/**
	 * ??????????.
	 * ?? "?? -> "???, "??? -> "???
	 *
	 * @param noun ?
	 * @return ??("?? ?? "")
	 **/
	public static String getSubjectParticle(String noun) {
		return hasFinalConsonant(noun) ? noun+"_1" : noun;
	}



	/**
	 * ???????????.
	 * ?? "?? -> "???, "??? -> "???"
	 *
	 * @param noun ?
	 * @return ???("?? ?? "??)
	 **/
	public static String getObjectParticle(String noun) {
		return noun + (hasFinalConsonant(noun) ? "_1" : "_2");
	}


	/**
	 * ?? ????? ????????.
	 *
	 * @param noun ?
	 * @return ??????true, ???false
	 **/
	private static boolean hasFinalConsonant(String noun) {
		char lastChar = noun.charAt(noun.length() - 1);
		return (lastChar - 0xAC00) % 28 != 0;
	}
}
