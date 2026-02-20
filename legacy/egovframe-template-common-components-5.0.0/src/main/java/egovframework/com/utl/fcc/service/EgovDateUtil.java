package egovframework.com.utl.fcc.service;

import java.security.SecureRandom;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.GregorianCalendar;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.TimeZone;

import com.ibm.icu.util.ChineseCalendar;

/**
 * Date ?????Util ?대옒??
 * 
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?댁쨷??
 * @since 2009.02.01
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.02.01  ?댁쨷??         理쒖큹 ?앹꽦
 *   2025.08.30  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-UselessParentheses(遺덊븘?뷀븳 愿꾪샇?ъ슜)
 *   2025.08.30  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *   2025.08.30  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-AvoidReassigningParameters(?섍꺼諛쏅뒗 硫붿냼??parameter 媛믪쓣 吏곸젒 蹂寃쏀븯??肄붾뱶 ?먯?)
 *
 *      </pre>
 */
public class EgovDateUtil {
    private static final  String SIMPLE_DATE_PATTERN = "yyyyMMdd";
	/**
	 * <p>
	 * yyyyMMdd ?뱀? yyyy-MM-dd ?뺤떇???좎쭨 臾몄옄?댁쓣 ?낅젰 諛쏆븘 ?? ?? ?쇱쓣 利앷컧?쒕떎. ?? ?? ?쇱? 媛媛먰븷 ?섎? ?섎??섎ŉ,
	 * ?뚯닔瑜??낅젰??寃쎌슦 媛먰븳??
	 * </p>
	 *
	 * <pre>
	 * DateUtil.addYearMonthDay("19810828", 0, 0, 19)  = "19810916"
	 * DateUtil.addYearMonthDay("20060228", 0, 0, -10) = "20060218"
	 * DateUtil.addYearMonthDay("20060228", 0, 0, 10)  = "20060310"
	 * DateUtil.addYearMonthDay("20060228", 0, 0, 32)  = "20060401"
	 * DateUtil.addYearMonthDay("20050331", 0, -1, 0)  = "20050228"
	 * DateUtil.addYearMonthDay("20050301", 0, 2, 30)  = "20050531"
	 * DateUtil.addYearMonthDay("20050301", 1, 2, 30)  = "20060531"
	 * DateUtil.addYearMonthDay("20040301", 2, 0, 0)   = "20060301"
	 * DateUtil.addYearMonthDay("20040229", 2, 0, 0)   = "20060228"
	 * DateUtil.addYearMonthDay("20040229", 2, 0, 1)   = "20060301"
	 * </pre>
	 *
	 * @param sDate   ?좎쭨 臾몄옄??yyyyMMdd, yyyy-MM-dd???뺤떇)
	 * @param year    媛媛먰븷 ?? 0???낅젰??寃쎌슦 媛媛먯씠 ?녿떎
	 * @param month   媛媛먰븷 ?? 0???낅젰??寃쎌슦 媛媛먯씠 ?녿떎
	 * @param day     媛媛먰븷 ?? 0???낅젰??寃쎌슦 媛媛먯씠 ?녿떎
	 * @return yyyyMMdd ?뺤떇???좎쭨 臾몄옄??
	 * @throws IllegalArgumentException ?좎쭨 ?щ㎎???뺥빐吏?諛붿? ?ㅻ? 寃쎌슦. ?낅젰 媛믪씠
	 *                                  <code>null</code>??寃쎌슦.
	 */
	public static String addYearMonthDay(String sDate, int year, int month, int day) {

		String dateStr = validChkDate(sDate);

		Calendar cal = Calendar.getInstance();
		SimpleDateFormat sdf = new SimpleDateFormat(SIMPLE_DATE_PATTERN, Locale.getDefault());
		try {
			cal.setTime(sdf.parse(dateStr));
		} catch (ParseException e) {
			throw new IllegalArgumentException("Invalid date format: " + dateStr);
		}

		if (year != 0) {
			cal.add(Calendar.YEAR, year);
		}
		if (month != 0) {
			cal.add(Calendar.MONTH, month);
		}
		if (day != 0) {
			cal.add(Calendar.DATE, day);
		}

		return sdf.format(cal.getTime());
	}

	/**
	 * <p>
	 * yyyyMMdd ?뱀? yyyy-MM-dd ?뺤떇???좎쭨 臾몄옄?댁쓣 ?낅젰 諛쏆븘 ?꾩쓣 利앷컧?쒕떎. <code>year</code>??媛媛먰븷 ?섎?
	 * ?섎??섎ŉ, ?뚯닔瑜??낅젰??寃쎌슦 媛먰븳??
	 * </p>
	 *
	 * <pre>
	 * DateUtil.addYear("20000201", 62)  = "20620201"
	 * DateUtil.addYear("20620201", -62) = "20000201"
	 * DateUtil.addYear("20040229", 2)   = "20060228"
	 * DateUtil.addYear("20060228", -2)  = "20040228"
	 * DateUtil.addYear("19000101", 200) = "21000101"
	 * </pre>
	 *
	 * @param dateStr ?좎쭨 臾몄옄??yyyyMMdd, yyyy-MM-dd???뺤떇)
	 * @param year    媛媛먰븷 ?? 0???낅젰??寃쎌슦 媛媛먯씠 ?녿떎
	 * @return yyyyMMdd ?뺤떇???좎쭨 臾몄옄??
	 * @throws IllegalArgumentException ?좎쭨 ?щ㎎???뺥빐吏?諛붿? ?ㅻ? 寃쎌슦. ?낅젰 媛믪씠
	 *                                  <code>null</code>??寃쎌슦.
	 */
	public static String addYear(String dateStr, int year) {
		return addYearMonthDay(dateStr, year, 0, 0);
	}

	/**
	 * <p>
	 * yyyyMMdd ?뱀? yyyy-MM-dd ?뺤떇???좎쭨 臾몄옄?댁쓣 ?낅젰 諛쏆븘 ?붿쓣 利앷컧?쒕떎. <code>month</code>??媛媛먰븷 ?섎?
	 * ?섎??섎ŉ, ?뚯닔瑜??낅젰??寃쎌슦 媛먰븳??
	 * </p>
	 *
	 * <pre>
	 * DateUtil.addMonth("20010201", 12)  = "20020201"
	 * DateUtil.addMonth("19800229", 12)  = "19810228"
	 * DateUtil.addMonth("20040229", 12)  = "20050228"
	 * DateUtil.addMonth("20050228", -12) = "20040228"
	 * DateUtil.addMonth("20060131", 1)   = "20060228"
	 * DateUtil.addMonth("20060228", -1)  = "20060128"
	 * </pre>
	 *
	 * @param dateStr ?좎쭨 臾몄옄??yyyyMMdd, yyyy-MM-dd???뺤떇)
	 * @param month   媛媛먰븷 ?? 0???낅젰??寃쎌슦 媛媛먯씠 ?녿떎
	 * @return yyyyMMdd ?뺤떇???좎쭨 臾몄옄??
	 * @throws IllegalArgumentException ?좎쭨 ?щ㎎???뺥빐吏?諛붿? ?ㅻ? 寃쎌슦. ?낅젰 媛믪씠
	 *                                  <code>null</code>??寃쎌슦.
	 */
	public static String addMonth(String dateStr, int month) {
		return addYearMonthDay(dateStr, 0, month, 0);
	}

	/**
	 * <p>
	 * yyyyMMdd ?뱀? yyyy-MM-dd ?뺤떇???좎쭨 臾몄옄?댁쓣 ?낅젰 諛쏆븘 ??day)瑜?利앷컧?쒕떎. <code>day</code>??媛媛먰븷
	 * ?섎? ?섎??섎ŉ, ?뚯닔瑜??낅젰??寃쎌슦 媛먰븳?? <br/>
	 * <br/>
	 * ?꾩뿉 ?뺤쓽??addDays 硫붿꽌?쒕뒗 ?ъ슜?먭? ParseException??諛섎뱶??泥섎━?댁빞 ?섎뒗 遺덊렪?⑥씠 ?덇린 ?뚮Ц??異붽???硫붿꽌?쒖씠??
	 * </p>
	 *
	 * <pre>
	 * DateUtil.addDay("19991201", 62) = "20000201"
	 * DateUtil.addDay("20000201", -62) = "19991201"
	 * DateUtil.addDay("20050831", 3) = "20050903"
	 * DateUtil.addDay("20050831", 3) = "20050903"
	 * // 2006??6??31?쇱? ?ㅼ젣濡?議댁옱?섏? ?딅뒗 ?좎쭨?대떎 -> 20060701濡?媛꾩＜?쒕떎
	 * DateUtil.addDay("20060631", 1) = "20060702"
	 * </pre>
	 *
	 * @param dateStr ?좎쭨 臾몄옄??yyyyMMdd, yyyy-MM-dd???뺤떇)
	 * @param day     媛媛먰븷 ?? 0???낅젰??寃쎌슦 媛媛먯씠 ?녿떎
	 * @return yyyyMMdd ?뺤떇???좎쭨 臾몄옄??
	 * @throws IllegalArgumentException ?좎쭨 ?щ㎎???뺥빐吏?諛붿? ?ㅻ? 寃쎌슦. ?낅젰 媛믪씠
	 *                                  <code>null</code>??寃쎌슦.
	 */
	public static String addDay(String dateStr, int day) {
		return addYearMonthDay(dateStr, 0, 0, day);
	}

	/**
	 * <p>
	 * yyyyMMdd ?뱀? yyyy-MM-dd ?뺤떇???좎쭨 臾몄옄??<code>dateStr1</code>怨?<code>
	 * dateStr2</code> ?ъ씠?????섎? 援ы븳??<br>
	 * <code>dateStr2</code>媛 <code>dateStr1</code> 蹂대떎 怨쇨굅 ?좎쭨??寃쎌슦?먮뒗 ?뚯닔瑜?諛섑솚?쒕떎. ?숈씪??
	 * 寃쎌슦?먮뒗 0??諛섑솚?쒕떎.
	 * </p>
	 *
	 * <pre>
	 * DateUtil.getDaysDiff("20060228","20060310") = 10
	 * DateUtil.getDaysDiff("20060101","20070101") = 365
	 * DateUtil.getDaysDiff("19990228","19990131") = -28
	 * DateUtil.getDaysDiff("20060801","20060802") = 1
	 * DateUtil.getDaysDiff("20060801","20060801") = 0
	 * </pre>
	 *
	 * @param sDate1 ?좎쭨 臾몄옄??yyyyMMdd, yyyy-MM-dd???뺤떇)
	 * @param sDate2 ?좎쭨 臾몄옄??yyyyMMdd, yyyy-MM-dd???뺤떇)
	 * @return ????李⑥씠.
	 * @throws IllegalArgumentException ?좎쭨 ?щ㎎???뺥빐吏?諛붿? ?ㅻ? 寃쎌슦. ?낅젰 媛믪씠
	 *                                  <code>null</code>??寃쎌슦.
	 */
	public static int getDaysDiff(String sDate1, String sDate2) {
		String dateStr1 = validChkDate(sDate1);
		String dateStr2 = validChkDate(sDate2);

		if (!checkDate(sDate1) || !checkDate(sDate2)) {
			throw new IllegalArgumentException("Invalid date format: args[0]=" + sDate1 + " args[1]=" + sDate2);
		}
		SimpleDateFormat sdf = new SimpleDateFormat(SIMPLE_DATE_PATTERN, Locale.getDefault());

		Date date1 = null;
		Date date2 = null;
		try {
			date1 = sdf.parse(dateStr1);
			date2 = sdf.parse(dateStr2);
		} catch (ParseException e) {
			throw new IllegalArgumentException("Invalid date format: args[0]=" + dateStr1 + " args[1]=" + dateStr2);
		}

		if (date1 != null && date2 != null) {
			int days1 = (int) (date1.getTime() / 3600000) / 24;
			int days2 = (int) (date2.getTime() / 3600000) / 24;
			return days2 - days1;
		} else {
			return 0;
		}

	}

	/**
	 * <p>
	 * yyyyMMdd ?뱀? yyyy-MM-dd ?뺤떇???좎쭨 臾몄옄?댁쓣 ?낅젰 諛쏆븘 ?좏슚???좎쭨?몄? 寃??
	 * </p>
	 *
	 * <pre>
	 * DateUtil.checkDate("1999-02-35") = false
	 * DateUtil.checkDate("2000-13-31") = false
	 * DateUtil.checkDate("2006-11-31") = false
	 * DateUtil.checkDate("2006-2-28")  = false
	 * DateUtil.checkDate("2006-2-8")   = false
	 * DateUtil.checkDate("20060228")   = true
	 * DateUtil.checkDate("2006-02-28") = true
	 * </pre>
	 *
	 * @param sDate ?좎쭨 臾몄옄??yyyyMMdd, yyyy-MM-dd???뺤떇)
	 * @return ?좏슚???좎쭨?몄? ?щ?
	 */
	public static boolean checkDate(String sDate) {
		String dateStr = validChkDate(sDate);

		String year = dateStr.substring(0, 4);
		String month = dateStr.substring(4, 6);
		String day = dateStr.substring(6);

		return checkDate(year, month, day);
	}

	/**
	 * <p>
	 * ?낅젰???? ?? ?쇱씠 ?좏슚?쒖? 寃??
	 * </p>
	 *
	 * @param year  ?곕룄
	 * @param month ??
	 * @param day   ??
	 * @return ?좏슚???좎쭨?몄? ?щ?
	 */
	public static boolean checkDate(String year, String month, String day) {
		try {
			SimpleDateFormat formatter = new SimpleDateFormat("yyyy.MM.dd", Locale.getDefault());

			Date result = formatter.parse(year + "." + month + "." + day);
			String resultStr = formatter.format(result);
			if (resultStr.equalsIgnoreCase(year + "." + month + "." + day)) {
				return true;
			} else {
				return false;
			}
		} catch (ParseException e) {
			return false;
		}
	}

	/**
	 * ?좎쭨?뺥깭??String???좎쭨 ?щ㎎ 諛?TimeZone??蹂寃쏀빐 二쇰뒗 硫붿꽌??
	 *
	 * @param strSource      諛붽? ?좎쭨 String
	 * @param fromDateFormat 湲곗〈???좎쭨 ?뺥깭
	 * @param toDateFormat   ?먰븯???좎쭨 ?뺥깭
	 * @param strTimeZone    蹂寃쏀븷 TimeZone(""?대㈃ 蹂寃??덊븿)
	 * @return ?뚯뒪 String???좎쭨 ?щ㎎??蹂寃쏀븳 String
	 */
	public static String convertDate(String strSource, String fromDateFormat, String toDateFormat, String strTimeZone) {
		SimpleDateFormat simpledateformat = null;
		Date date = null;
		String fromFormat = "";
		String toFormat = "";

		if (EgovStringUtil.isNullToString(strSource).isEmpty()) {
			return "";
		}
		if (EgovStringUtil.isNullToString(fromDateFormat).isEmpty()) {
			fromFormat = "yyyyMMddHHmmss"; // default媛?
		}
		if (EgovStringUtil.isNullToString(toDateFormat).isEmpty()) {
			toFormat = "yyyy-MM-dd HH:mm:ss"; // default媛?
		}

		try {
			simpledateformat = new SimpleDateFormat(fromFormat, Locale.getDefault());
			date = simpledateformat.parse(strSource);
			if (!EgovStringUtil.isNullToString(strTimeZone).isEmpty()) {
				simpledateformat.setTimeZone(TimeZone.getTimeZone(strTimeZone));
			}
			simpledateformat = new SimpleDateFormat(toFormat, Locale.getDefault());
		} catch (ParseException exception) {
			throw new RuntimeException(exception);
		}

		return simpledateformat.format(date);

	}

	/**
	 * yyyyMMdd ?뺤떇???좎쭨臾몄옄?댁쓣 ?먰븯??罹먮┃??ch)濡?履쇨컻 ?뚮젮以??br/>
	 * 
	 * <pre>
	* ex) 20030405, ch(.) -> 2003.04.05
	* ex) 200304, ch(.) -> 2003.04
	* ex) 20040101,ch(/) --> 2004/01/01 濡?由ы꽩
	 * </pre>
	 *
	 * @param sDate yyyyMMdd ?뺤떇???좎쭨臾몄옄??
	 * @param ch   援щ텇??
	 * @return 蹂?섎맂 臾몄옄??
	 */
	public static String formatDate(String sDate, String ch) {
		String dateStr = validChkDate(sDate);

		String str = dateStr.trim();
		String yyyy = "";
		String mm = "";
		String dd = "";

		if (str.length() == 8) {
			yyyy = str.substring(0, 4);
			if (yyyy.equals("0000")) {
				return "";
			}

			mm = str.substring(4, 6);
			if (mm.equals("00")) {
				return yyyy;
			}

			dd = str.substring(6, 8);
			if (dd.equals("00")) {
				return yyyy + ch + mm;
			}

			return yyyy + ch + mm + ch + dd;

		} else if (str.length() == 6) {
			yyyy = str.substring(0, 4);
			if (yyyy.equals("0000")) {
				return "";
			}

			mm = str.substring(4, 6);
			if (mm.equals("00")) {
				return yyyy;
			}

			return yyyy + ch + mm;

		} else if (str.length() == 4) {
			yyyy = str.substring(0, 4);
			if (yyyy.equals("0000")) {
				return "";
			} else {
				return yyyy;
			}
		} else {
			return "";
		}
	}

	/**
	 * HH24MISS ?뺤떇???쒓컙臾몄옄?댁쓣 ?먰븯??罹먮┃??ch)濡?履쇨컻 ?뚮젮以??<br>
	 * 
	 * <pre>
	 *     ex) 151241, ch(/) -> 15/12/31
	 * </pre>
	 *
	 * @param sTime HH24MISS ?뺤떇???쒓컙臾몄옄??
	 * @param ch  援щ텇??
	 * @return 蹂?섎맂 臾몄옄??
	 */
	public static String formatTime(String sTime, String ch) {
		String timeStr = validChkTime(sTime);
		return timeStr.substring(0, 2) + ch + timeStr.substring(2, 4) + ch + timeStr.substring(4, 6);
	}

	/**
	 * ?곕룄瑜??낅젰 諛쏆븘 ?대떦 ?곕룄 2?붿쓽 留먯씪(?쇱닔)瑜?臾몄옄?대줈 諛섑솚?쒕떎.
	 *
	 * @param year
	 * @return ?대떦 ?곕룄 2?붿쓽 留먯씪(?쇱닔)
	 */
	public String leapYear(int year) {
		if (year % 4 == 0 && year % 100 != 0 || year % 400 == 0) {
			return "29";
		}

		return "28";
	}

	/**
	 * <p>
	 * ?낅젰諛쏆? ?곕룄媛 ?ㅻ뀈?몄? ?꾨땶吏 寃?ы븳??
	 * </p>
	 *
	 * <pre>
	 * DateUtil.isLeapYear(2004) = false
	 * DateUtil.isLeapYear(2005) = true
	 * DateUtil.isLeapYear(2006) = true
	 * </pre>
	 *
	 * @param year ?곕룄
	 * @return ?ㅻ뀈 ?щ?
	 */
	public static boolean isLeapYear(int year) {
		if (year % 4 == 0 && year % 100 != 0 || year % 400 == 0) {
			return false;
		}
		return true;
	}

	/**
	 * ?꾩옱(?쒓뎅湲곗?) ?좎쭨?뺣낫瑜??삳뒗?? <BR>
	 * ?쒓린踰뺤? yyyy-mm-dd <BR>
	 * 
	 * @return String yyyymmdd?뺥깭???꾩옱 ?쒓뎅?쒓컙. <BR>
	 */
	public static String getToday() {
		return getCurrentDate("");
	}

	/**
	 * ?꾩옱(?쒓뎅湲곗?) ?좎쭨?뺣낫瑜??삳뒗?? <BR>
	 * ?쒓린踰뺤? yyyy-mm-dd <BR>
	 * 
	 * @return String yyyymmdd?뺥깭???꾩옱 ?쒓뎅?쒓컙. <BR>
	 */
	public static String getCurrentDate(String dateType) {
		Calendar aCalendar = Calendar.getInstance();

		int year = aCalendar.get(Calendar.YEAR);
		int month = aCalendar.get(Calendar.MONTH) + 1;
		int date = aCalendar.get(Calendar.DATE);
		String strDate = Integer.toString(year)
				+ ((month < 10) ? "0" + Integer.toString(month) : Integer.toString(month))
				+ ((date < 10) ? "0" + Integer.toString(date) : Integer.toString(date));

		if (!"".equals(dateType)) {
			strDate = convertDate(strDate, SIMPLE_DATE_PATTERN, dateType);
		}

		return strDate;
	}

	/**
	 * ?좎쭨?뺥깭??String???좎쭨 ?щ㎎留뚯쓣 蹂寃쏀빐 二쇰뒗 硫붿꽌??
	 * 
	 * @param sDate      ?좎쭨
	 * @param sTime      ?쒓컙
	 * @param sFormatStr ?щĸ ?ㅽ듃留?臾몄옄??
	 * @return 吏?뺥븳 ?좎쭨/?쒓컙??吏?뺥븳 ?щ㎎?쇰줈 異쒕젰
	 * @See Letter Date or Time Component Presentation Examples G Era designator
	 *      Text AD y Year Year 1996; 96 M Month in year Month July; Jul; 07 w Week
	 *      in year Number 27 W Week in month Number 2 D Day in year Number 189 d
	 *      Day in month Number 10 F Day of week in month Number 2 E Day in week
	 *      Text Tuesday; Tue a Am/pm marker Text PM H Hour in day (0-23) Number 0 k
	 *      Hour in day (1-24) Number 24 K Hour in am/pm (0-11) Number 0 h Hour in
	 *      am/pm (1-12) Number 12 m Minute in hour Number 30 s Second in minute
	 *      Number 55 S Millisecond Number 978 z Time zone General time zone Pacific
	 *      Standard Time; PST; GMT-08:00 Z Time zone RFC 822 time zone -0800
	 * 
	 *      Date and Time Pattern Result "yyyy.MM.dd G 'at' HH:mm:ss z" 2001.07.04
	 *      AD at 12:08:56 PDT "EEE, MMM d, ''yy" Wed, Jul 4, '01 "h:mm a" 12:08 PM
	 *      "hh 'o''clock' a, zzzz" 12 o'clock PM, Pacific Daylight Time "K:mm a, z"
	 *      0:08 PM, PDT "yyyyy.MMMMM.dd GGG hh:mm aaa" 02001.July.04 AD 12:08 PM
	 *      "EEE, d MMM yyyy HH:mm:ss Z" Wed, 4 Jul 2001 12:08:56 -0700
	 *      "yyMMddHHmmssZ" 010704120856-0700
	 * 
	 */
	public static String convertDate(String sDate, String sTime, String sFormatStr) {
		String dateStr = validChkDate(sDate);
		String timeStr = validChkTime(sTime);

		Calendar cal = null;
		cal = Calendar.getInstance();

		cal.set(Calendar.YEAR, Integer.parseInt(dateStr.substring(0, 4)));
		cal.set(Calendar.MONTH, Integer.parseInt(dateStr.substring(4, 6)) - 1);
		cal.set(Calendar.DAY_OF_MONTH, Integer.parseInt(dateStr.substring(6, 8)));
		cal.set(Calendar.HOUR_OF_DAY, Integer.parseInt(timeStr.substring(0, 2)));
		cal.set(Calendar.MINUTE, Integer.parseInt(timeStr.substring(2, 4)));

		SimpleDateFormat sdf = new SimpleDateFormat(sFormatStr, Locale.ENGLISH);

		return sdf.format(cal.getTime());
	}

	/**
	 * ?낅젰諛쏆? ?쇱옄 ?ъ씠???꾩쓽???쇱옄瑜?諛섑솚
	 * 
	 * @param sDate1 ?쒖옉?쇱옄
	 * @param sDate2 醫낅즺?쇱옄
	 * @return ?꾩쓽?쇱옄
	 */
	public static String getRandomDate(String sDate1, String sDate2) {
		String dateStr1 = validChkDate(sDate1);
		String dateStr2 = validChkDate(sDate2);

		String randomDate = null;

		int sYear, sMonth, sDay;
		int eYear, eMonth, eDay;

		sYear = Integer.parseInt(dateStr1.substring(0, 4));
		sMonth = Integer.parseInt(dateStr1.substring(4, 6));
		sDay = Integer.parseInt(dateStr1.substring(6, 8));

		eYear = Integer.parseInt(dateStr2.substring(0, 4));
		eMonth = Integer.parseInt(dateStr2.substring(4, 6));
		eDay = Integer.parseInt(dateStr2.substring(6, 8));

		GregorianCalendar beginDate = new GregorianCalendar(sYear, sMonth - 1, sDay, 0, 0);
		GregorianCalendar endDate = new GregorianCalendar(eYear, eMonth - 1, eDay, 23, 59);

		if (endDate.getTimeInMillis() < beginDate.getTimeInMillis()) {
			throw new IllegalArgumentException("Invalid input date : " + sDate1 + "~" + sDate2);
		}

		SecureRandom r = new SecureRandom();

		r.setSeed(new Date().getTime());

		long rand = ((r.nextLong() >>> 1) % (endDate.getTimeInMillis() - beginDate.getTimeInMillis() + 1))
				+ beginDate.getTimeInMillis();

		GregorianCalendar cal = new GregorianCalendar();

		SimpleDateFormat calformat = new SimpleDateFormat(SIMPLE_DATE_PATTERN, Locale.ENGLISH);
		cal.setTimeInMillis(rand);
		randomDate = calformat.format(cal.getTime());

		// ?쒕뜡臾몄옄?대? 由ы꽩
		return randomDate;
	}

	/**
	 * ?낅젰諛쏆? ?묐젰?쇱옄瑜?蹂?섑븯???뚮젰?쇱옄濡?諛섑솚
	 * 
	 * @param sDate ?묐젰?쇱옄
	 * @return ?뚮젰?쇱옄
	 */
	public static Map<String, String> toLunar(String sDate) {
		String dateStr = validChkDate(sDate);

		Map<String, String> hm = new HashMap<String, String>();
		hm.put("day", "");
		hm.put("leap", "0");

		if (dateStr.length() != 8) {
			return hm;
		}

		Calendar cal;
		ChineseCalendar lcal;

		cal = Calendar.getInstance();
		lcal = new ChineseCalendar();

		cal.set(Calendar.YEAR, Integer.parseInt(dateStr.substring(0, 4)));
		cal.set(Calendar.MONTH, Integer.parseInt(dateStr.substring(4, 6)) - 1);
		cal.set(Calendar.DAY_OF_MONTH, Integer.parseInt(dateStr.substring(6, 8)));

		lcal.setTimeInMillis(cal.getTimeInMillis());

		String year = String.valueOf(lcal.get(ChineseCalendar.EXTENDED_YEAR) - 2637);
		String month = String.valueOf(lcal.get(ChineseCalendar.MONTH) + 1);
		String day = String.valueOf(lcal.get(ChineseCalendar.DAY_OF_MONTH));
		String leap = String.valueOf(lcal.get(ChineseCalendar.IS_LEAP_MONTH));

		String pad4Str = "0000";
		String pad2Str = "00";

		String retYear = (pad4Str + year).substring(year.length());
		String retMonth = (pad2Str + month).substring(month.length());
		String retDay = (pad2Str + day).substring(day.length());

		String sDay = retYear + retMonth + retDay;

		hm.put("day", sDay);
		hm.put("leap", leap);

		return hm;
	}

	/**
	 * ?낅젰諛쏆? ?뚮젰?쇱옄瑜?蹂?섑븯???묐젰?쇱옄濡?諛섑솚
	 * 
	 * @param sDate      ?뚮젰?쇱옄
	 * @param iLeapMonth ?뚮젰?ㅻ떖?щ?(IS_LEAP_MONTH)
	 * @return ?묐젰?쇱옄
	 */
	public static String toSolar(String sDate, int iLeapMonth) {
		String dateStr = validChkDate(sDate);

		Calendar cal;
		ChineseCalendar lcal;

		cal = Calendar.getInstance();
		lcal = new ChineseCalendar();

		lcal.set(ChineseCalendar.EXTENDED_YEAR, Integer.parseInt(dateStr.substring(0, 4)) + 2637);
		lcal.set(ChineseCalendar.MONTH, Integer.parseInt(dateStr.substring(4, 6)) - 1);
		lcal.set(ChineseCalendar.DAY_OF_MONTH, Integer.parseInt(dateStr.substring(6, 8)));
		lcal.set(ChineseCalendar.IS_LEAP_MONTH, iLeapMonth);

		cal.setTimeInMillis(lcal.getTimeInMillis());

		String year = String.valueOf(cal.get(Calendar.YEAR));
		String month = String.valueOf(cal.get(Calendar.MONTH) + 1);
		String day = String.valueOf(cal.get(Calendar.DAY_OF_MONTH));

		String pad4Str = "0000";
		String pad2Str = "00";

		String retYear = (pad4Str + year).substring(year.length());
		String retMonth = (pad2Str + month).substring(month.length());
		String retDay = (pad2Str + day).substring(day.length());

		return retYear + retMonth + retDay;
	}

	/**
	 * ?낅젰諛쏆? ?붿씪???곷Ц紐낆쓣 援?Ц紐낆쓽 ?붿씪濡?諛섑솚
	 * 
	 * @param sWeek ?곷Ц ?붿씪紐?
	 * @return 援?Ц ?붿씪紐?
	 */
	public static String convertWeek(String sWeek) {
		String retStr = null;

		if (sWeek.equals("SUN")) {
			retStr = "?쇱슂??;
		} else if (sWeek.equals("MON")) {
			retStr = "?붿슂??;
		} else if (sWeek.equals("TUE")) {
			retStr = "?붿슂??;
		} else if (sWeek.equals("WED")) {
			retStr = "?섏슂??;
		} else if (sWeek.equals("THR")) {
			retStr = "紐⑹슂??;
		} else if (sWeek.equals("FRI")) {
			retStr = "湲덉슂??;
		} else if (sWeek.equals("SAT")) {
			retStr = "?좎슂??;
		}

		return retStr;
	}

	/**
	 * ?낅젰?쇱옄???좏슚 ?щ?瑜??뺤씤
	 * 
	 * @param sDate ?쇱옄
	 * @return ?좏슚 ?щ?
	 */
	public static boolean validDate(String sDate) {
		String dateStr = validChkDate(sDate);

		Calendar cal;
		boolean ret = false;

		cal = Calendar.getInstance();

		cal.set(Calendar.YEAR, Integer.parseInt(dateStr.substring(0, 4)));
		cal.set(Calendar.MONTH, Integer.parseInt(dateStr.substring(4, 6)) - 1);
		cal.set(Calendar.DAY_OF_MONTH, Integer.parseInt(dateStr.substring(6, 8)));

		String year = String.valueOf(cal.get(Calendar.YEAR));
		String month = String.valueOf(cal.get(Calendar.MONTH) + 1);
		String day = String.valueOf(cal.get(Calendar.DAY_OF_MONTH));

		String pad4Str = "0000";
		String pad2Str = "00";

		String retYear = (pad4Str + year).substring(year.length());
		String retMonth = (pad2Str + month).substring(month.length());
		String retDay = (pad2Str + day).substring(day.length());

		String retYMD = retYear + retMonth + retDay;

		if (sDate.equals(retYMD)) {
			ret = true;
		}

		return ret;
	}

	/**
	 * ?낅젰?쇱옄, ?붿씪???좏슚 ?щ?瑜??뺤씤
	 * 
	 * @param sDate ?쇱옄
	 * @param sWeek ?붿씪 (DAY_OF_WEEK)
	 * @return ?좏슚 ?щ?
	 */
	public static boolean validDate(String sDate, int sWeek) {
		String dateStr = validChkDate(sDate);

		Calendar cal;
		boolean ret = false;

		cal = Calendar.getInstance();

		cal.set(Calendar.YEAR, Integer.parseInt(dateStr.substring(0, 4)));
		cal.set(Calendar.MONTH, Integer.parseInt(dateStr.substring(4, 6)) - 1);
		cal.set(Calendar.DAY_OF_MONTH, Integer.parseInt(dateStr.substring(6, 8)));

		int week = cal.get(Calendar.DAY_OF_WEEK);

		if (validDate(sDate)) {
			if (sWeek == week) {
				ret = true;
			}
		}

		return ret;
	}

	/**
	 * ?낅젰?쒓컙???좏슚 ?щ?瑜??뺤씤
	 * 
	 * @param sTime ?낅젰?쒓컙
	 * @return ?좏슚 ?щ?
	 */
	public static boolean validTime(String sTime) {
		String timeStr = validChkTime(sTime);

		Calendar cal;
		boolean ret = false;

		cal = Calendar.getInstance();

		cal.set(Calendar.HOUR_OF_DAY, Integer.parseInt(timeStr.substring(0, 2)));
		cal.set(Calendar.MINUTE, Integer.parseInt(timeStr.substring(2, 4)));

		String hh = String.valueOf(cal.get(Calendar.HOUR_OF_DAY));
		String mm = String.valueOf(cal.get(Calendar.MINUTE));

		String pad2Str = "00";

		String retHH = (pad2Str + hh).substring(hh.length());
		String retMM = (pad2Str + mm).substring(mm.length());

		String retTime = retHH + retMM;

		if (sTime.equals(retTime)) {
			ret = true;
		}

		return ret;
	}

	/**
	 * ?낅젰???쇱옄???? ?? ?쇱쓣 媛媛먰븳 ?좎쭨???붿씪??諛섑솚
	 * 
	 * @param sDate ?좎쭨
	 * @param year  ??
	 * @param month ??
	 * @param day   ??
	 * @return 怨꾩궛???쇱옄???붿씪(DAY_OF_WEEK)
	 */
	public static String addYMDtoWeek(String sDate, int year, int month, int day) {
		String dateStr = validChkDate(sDate);

		dateStr = addYearMonthDay(dateStr, year, month, day);

		Calendar cal = Calendar.getInstance();
		SimpleDateFormat sdf = new SimpleDateFormat(SIMPLE_DATE_PATTERN, Locale.ENGLISH);
		try {
			cal.setTime(sdf.parse(dateStr));
		} catch (ParseException e) {
			throw new IllegalArgumentException("Invalid date format: " + dateStr);
		}

		SimpleDateFormat rsdf = new SimpleDateFormat("E", Locale.ENGLISH);

		return rsdf.format(cal.getTime());
	}

	/**
	 * ?낅젰???쇱옄???? ?? ?? ?쒓컙, 遺꾩쓣 媛媛먰븳 ?좎쭨, ?쒓컙???щĸ?ㅽ듃留??뺤떇?쇰줈 諛섑솚
	 * 
	 * @param sDate     ?좎쭨
	 * @param sTime     ?쒓컙
	 * @param year      ??
	 * @param month     ??
	 * @param day       ??
	 * @param hour      ?쒓컙
	 * @param minute    遺?
	 * @param formatStr ?щĸ?ㅽ듃留?
	 * @return
	 */
	public static String addYMDtoDayTime(String sDate, String sTime, int year, int month, int day, int hour, int minute,
			String formatStr) {
		String dateStr = validChkDate(sDate);
		String timeStr = validChkTime(sTime);

		dateStr = addYearMonthDay(dateStr, year, month, day);

		dateStr = convertDate(dateStr, timeStr, "yyyyMMddHHmm");

		Calendar cal = Calendar.getInstance();
		SimpleDateFormat sdf = new SimpleDateFormat("yyyyMMddHHmm", Locale.ENGLISH);

		try {
			cal.setTime(sdf.parse(dateStr));
		} catch (ParseException e) {
			throw new IllegalArgumentException("Invalid date format: " + dateStr);
		}

		if (hour != 0) {
			cal.add(Calendar.HOUR, hour);
		}

		if (minute != 0) {
			cal.add(Calendar.MINUTE, minute);
		}

		SimpleDateFormat rsdf = new SimpleDateFormat(formatStr, Locale.ENGLISH);

		return rsdf.format(cal.getTime());
	}

	/**
	 * ?낅젰???쇱옄瑜?int ?뺤쑝濡?諛섑솚
	 * 
	 * @param sDate ?쇱옄
	 * @return int(?쇱옄)
	 */
	public static int datetoInt(String sDate) {
		return Integer.parseInt(convertDate(sDate, "0000", SIMPLE_DATE_PATTERN));
	}

	/**
	 * ?낅젰???쒓컙??int ?뺤쑝濡?諛섑솚
	 * 
	 * @param sTime ?쒓컙
	 * @return int(?쒓컙)
	 */
	public static int timetoInt(String sTime) {
		return Integer.parseInt(convertDate("00000101", sTime, "HHmm"));
	}

	/**
	 * ?낅젰???쇱옄 臾몄옄?댁쓣 ?뺤씤?섍퀬 8?먮━濡?由ы꽩
	 * 
	 * @param dateStr
	 * @return
	 */
	public static String validChkDate(String dateStr) {
		if (dateStr == null || !(dateStr.trim().length() == 8 || dateStr.trim().length() == 10)) {
			throw new IllegalArgumentException("Invalid date format: " + dateStr);
		}

		if (dateStr.length() == 10) {
			return EgovStringUtil.removeMinusChar(dateStr);
		}

		return dateStr;
	}

	/**
	 * ?낅젰???쇱옄 臾몄옄?댁쓣 ?뺤씤?섍퀬 8?먮━濡?由ы꽩
	 * 
	 * @param timeStr
	 * @return
	 */
	public static String validChkTime(String timeStr) {
		if (timeStr == null || !(timeStr.trim().length() == 4)) {
			throw new IllegalArgumentException("Invalid time format: " + timeStr);
		}

		if (timeStr.length() == 5) {
			return EgovStringUtil.remove(timeStr, ':');
		}

		return timeStr;
	}

}
