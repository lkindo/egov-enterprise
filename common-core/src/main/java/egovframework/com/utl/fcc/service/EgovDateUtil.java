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
 * Date ??????Util ?????
 * 
 * @author ?⑤벏???뺥돩??揶쏆뮆而?? ??곸㉦??
 * @since 2009.02.01
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 揶쏆뮇?????Modification Information) ==
 *
 *   ??륁젟??     ??륁젟??          ??륁젟??곸뒠
 *  -------    --------    ---------------------------
 *   2009.02.01  ??곸㉦??         筌ㅼ뮇????밴쉐
 *   2025.08.30  ??媛??         2025???뚢뫂?껆뵳????PMD嚥???곕늄?紐꾩띃??癰귣똻釉??뚯젎 筌욊쑬???랁???볤탢??띾┛-UselessParentheses(?븍뜇釉?酉釉??욧쑵?????
 *   2025.08.30  ??媛??         2025???뚢뫂?껆뵳????PMD嚥???곕늄?紐꾩띃??癰귣똻釉??뚯젎 筌욊쑬???랁???볤탢??띾┛-LocalVariableNamingConventions(final???袁⑤빒 癰궰??롫뮉 獄쏅쵐夷????釉??????곸벉)
 *   2025.08.30  ??媛??         2025???뚢뫂?껆뵳????PMD嚥???곕늄?紐꾩띃??癰귣똻釉??뚯젎 筌욊쑬???랁???볤탢??띾┛-AvoidReassigningParameters(??띻볼獄쏆룆??筌롫뗄???parameter 揶쏅???筌욊낯??癰궰野껋?釉???꾨뗀諭??癒?)
 *
 *      </pre>
 */
public class EgovDateUtil {
	private static final String SIMPLE_DATE_PATTERN = "yyyyMMdd";

	/**
	 * <p>
	 * yyyyMMdd ?諭? yyyy-MM-dd ?類ㅻ뻼???醫롮? ?얜챷???곸뱽 ??낆젾 獄쏆룇釉??? ?? ??깆뱽 筌앹빓而??뺣뼄.
	 * ?? ?? ??? 揶쎛揶쏅?釉???? ?????렽?
	 * ???땾????낆젾??野껋럩??揶쏅?釉??
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
	 * @param sDate ?醫롮? ?얜챷???yyyyMMdd, yyyy-MM-dd???類ㅻ뻼)
	 * @param year  揶쎛揶쏅?釉??? 0????낆젾??野껋럩??揶쎛揶쏅Ŋ????용뼄
	 * @param month 揶쎛揶쏅?釉??? 0????낆젾??野껋럩??揶쎛揶쏅Ŋ????용뼄
	 * @param day   揶쎛揶쏅?釉??? 0????낆젾??野껋럩??揶쎛揶쏅Ŋ????용뼄
	 * @return yyyyMMdd ?類ㅻ뻼???醫롮? ?얜챷???
	 * @throws IllegalArgumentException ?醫롮? ??????類λ퉸筌?獄쏅뗄? ??? 野껋럩?? ??낆젾 揶쏅???
	 *                                  <code>null</code>??野껋럩??
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
	 * yyyyMMdd ?諭? yyyy-MM-dd ?類ㅻ뻼???醫롮? ?얜챷???곸뱽 ??낆젾 獄쏆룇釉??袁⑹뱽 筌앹빓而??뺣뼄.
	 * <code>year</code>??揶쎛揶쏅?釉????
	 * ?????렽? ???땾????낆젾??野껋럩??揶쏅?釉??
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
	 * @param dateStr ?醫롮? ?얜챷???yyyyMMdd, yyyy-MM-dd???類ㅻ뻼)
	 * @param year    揶쎛揶쏅?釉??? 0????낆젾??野껋럩??揶쎛揶쏅Ŋ????용뼄
	 * @return yyyyMMdd ?類ㅻ뻼???醫롮? ?얜챷???
	 * @throws IllegalArgumentException ?醫롮? ??????類λ퉸筌?獄쏅뗄? ??? 野껋럩?? ??낆젾 揶쏅???
	 *                                  <code>null</code>??野껋럩??
	 */
	public static String addYear(String dateStr, int year) {
		return addYearMonthDay(dateStr, year, 0, 0);
	}

	/**
	 * <p>
	 * yyyyMMdd ?諭? yyyy-MM-dd ?類ㅻ뻼???醫롮? ?얜챷???곸뱽 ??낆젾 獄쏆룇釉??遺우뱽 筌앹빓而??뺣뼄.
	 * <code>month</code>??揶쎛揶쏅?釉????
	 * ?????렽? ???땾????낆젾??野껋럩??揶쏅?釉??
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
	 * @param dateStr ?醫롮? ?얜챷???yyyyMMdd, yyyy-MM-dd???類ㅻ뻼)
	 * @param month   揶쎛揶쏅?釉??? 0????낆젾??野껋럩??揶쎛揶쏅Ŋ????용뼄
	 * @return yyyyMMdd ?類ㅻ뻼???醫롮? ?얜챷???
	 * @throws IllegalArgumentException ?醫롮? ??????類λ퉸筌?獄쏅뗄? ??? 野껋럩?? ??낆젾 揶쏅???
	 *                                  <code>null</code>??野껋럩??
	 */
	public static String addMonth(String dateStr, int month) {
		return addYearMonthDay(dateStr, 0, month, 0);
	}

	/**
	 * <p>
	 * yyyyMMdd ?諭? yyyy-MM-dd ?類ㅻ뻼???醫롮? ?얜챷???곸뱽 ??낆젾 獄쏆룇釉???day)??筌앹빓而??뺣뼄.
	 * <code>day</code>??揶쎛揶쏅?釉?
	 * ??? ?????렽? ???땾????낆젾??野껋럩??揶쏅?釉?? <br/>
	 * <br/>
	 * ?袁⑸퓠 ?類ㅼ벥??addDays 筌롫뗄苑??뺣뮉 ????癒? ParseException??獄쏆꼶諭??筌ｌ꼶???곷튊 ??롫뮉
	 * ?븍뜇???μ뵠 ??뉖┛ ??????곕떽???筌롫뗄苑??뽰뵠??
	 * </p>
	 *
	 * <pre>
	 * DateUtil.addDay("19991201", 62) = "20000201"
	 * DateUtil.addDay("20000201", -62) = "19991201"
	 * DateUtil.addDay("20050831", 3) = "20050903"
	 * DateUtil.addDay("20050831", 3) = "20050903"
	 * // 2006??6??31??? ??쇱젫嚥?鈺곕똻???? ??낅뮉 ?醫롮?????-> 20060701嚥?揶쏄쑴竊??뺣뼄
	 * DateUtil.addDay("20060631", 1) = "20060702"
	 * </pre>
	 *
	 * @param dateStr ?醫롮? ?얜챷???yyyyMMdd, yyyy-MM-dd???類ㅻ뻼)
	 * @param day     揶쎛揶쏅?釉??? 0????낆젾??野껋럩??揶쎛揶쏅Ŋ????용뼄
	 * @return yyyyMMdd ?類ㅻ뻼???醫롮? ?얜챷???
	 * @throws IllegalArgumentException ?醫롮? ??????類λ퉸筌?獄쏅뗄? ??? 野껋럩?? ??낆젾 揶쏅???
	 *                                  <code>null</code>??野껋럩??
	 */
	public static String addDay(String dateStr, int day) {
		return addYearMonthDay(dateStr, 0, 0, day);
	}

	/**
	 * <p>
	 * yyyyMMdd ?諭? yyyy-MM-dd ?類ㅻ뻼???醫롮? ?얜챷???<code>dateStr1</code>??<code>
	 * dateStr2</code> ?????????? ?닌뗫립??<br>
	 * <code>dateStr2</code>揶쎛 <code>dateStr1</code> 癰귣????⑥눊援??醫롮???野껋럩??癒?뮉
	 * ???땾??獄쏆꼹???뺣뼄. ??덉뵬??
	 * 野껋럩??癒?뮉 0??獄쏆꼹???뺣뼄.
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
	 * @param sDate1 ?醫롮? ?얜챷???yyyyMMdd, yyyy-MM-dd???類ㅻ뻼)
	 * @param sDate2 ?醫롮? ?얜챷???yyyyMMdd, yyyy-MM-dd???類ㅻ뻼)
	 * @return ????筌△뫁??
	 * @throws IllegalArgumentException ?醫롮? ??????類λ퉸筌?獄쏅뗄? ??? 野껋럩?? ??낆젾 揶쏅???
	 *                                  <code>null</code>??野껋럩??
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
	 * yyyyMMdd ?諭? yyyy-MM-dd ?類ㅻ뻼???醫롮? ?얜챷???곸뱽 ??낆젾 獄쏆룇釉??醫륁뒞???醫롮??紐? 野꺜??
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
	 * @param sDate ?醫롮? ?얜챷???yyyyMMdd, yyyy-MM-dd???類ㅻ뻼)
	 * @return ?醫륁뒞???醫롮??紐? ???
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
	 * ??낆젾???? ?? ??깆뵠 ?醫륁뒞??? 野꺜??
	 * </p>
	 *
	 * @param year  ?怨뺣즲
	 * @param month ??
	 * @param day   ??
	 * @return ?醫륁뒞???醫롮??紐? ???
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
	 * ?醫롮??類κ묶??String???醫롮? ????獄?TimeZone??癰궰野껋?鍮?雅뚯눖??筌롫뗄苑??
	 *
	 * @param strSource      獄쏅떽? ?醫롮? String
	 * @param fromDateFormat 疫꿸퀣????醫롮? ?類κ묶
	 * @param toDateFormat   ?癒곕릭???醫롮? ?類κ묶
	 * @param strTimeZone    癰궰野껋?釉?TimeZone(""????癰궰野???딅맙)
	 * @return ???뮞 String???醫롮? ?????癰궰野껋?釉?String
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
			fromFormat = "yyyyMMddHHmmss"; // default
		} else {
			fromFormat = fromDateFormat;
		}
		if (EgovStringUtil.isNullToString(toDateFormat).isEmpty()) {
			toFormat = "yyyy-MM-dd HH:mm:ss"; // default
		} else {
			toFormat = toDateFormat;
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
	 * yyyyMMdd ?類ㅻ뻼???醫롮??얜챷???곸뱽 ?癒곕릭??筌?Ŧ???ch)嚥?筌잛눊而????젻餓Β??br/>
	 * 
	 * <pre>
	* ex) 20030405, ch(.) -> 2003.04.05
	* ex) 200304, ch(.) -> 2003.04
	* ex) 20040101,ch(/) --> 2004/01/01 嚥??귐뗪쉘
	 * </pre>
	 *
	 * @param sDate yyyyMMdd ?類ㅻ뻼???醫롮??얜챷???
	 * @param ch    ?닌됲뀋??
	 * @return 癰궰??롫쭆 ?얜챷???
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
	 * HH24MISS ?類ㅻ뻼????볦퍢?얜챷???곸뱽 ?癒곕릭??筌?Ŧ???ch)嚥?筌잛눊而????젻餓Β??<br>
	 * 
	 * <pre>
	 *     ex) 151241, ch(/) -> 15/12/31
	 * </pre>
	 *
	 * @param sTime HH24MISS ?類ㅻ뻼????볦퍢?얜챷???
	 * @param ch    ?닌됲뀋??
	 * @return 癰궰??롫쭆 ?얜챷???
	 */
	public static String formatTime(String sTime, String ch) {
		String timeStr = validChkTime(sTime);
		return timeStr.substring(0, 2) + ch + timeStr.substring(2, 4) + ch + timeStr.substring(4, 6);
	}

	/**
	 * ?怨뺣즲????낆젾 獄쏆룇釉??????怨뺣즲 2?遺우벥 筌띾Ŋ????깅땾)???얜챷???以?獄쏆꼹???뺣뼄.
	 *
	 * @param year
	 * @return ?????怨뺣즲 2?遺우벥 筌띾Ŋ????깅땾)
	 */
	public String leapYear(int year) {
		if (year % 4 == 0 && year % 100 != 0 || year % 400 == 0) {
			return "29";
		}

		return "28";
	}

	/**
	 * <p>
	 * ??낆젾獄쏆룇? ?怨뺣즲揶쎛 ??삳?紐? ?袁⑤빒筌왖 野꺜??釉??
	 * </p>
	 *
	 * <pre>
	 * DateUtil.isLeapYear(2004) = false
	 * DateUtil.isLeapYear(2005) = true
	 * DateUtil.isLeapYear(2006) = true
	 * </pre>
	 *
	 * @param year ?怨뺣즲
	 * @return ??삳????
	 */
	public static boolean isLeapYear(int year) {
		if (year % 4 == 0 && year % 100 != 0 || year % 400 == 0) {
			return false;
		}
		return true;
	}

	/**
	 * ?袁⑹삺(??볥럢疫꿸퀣?) ?醫롮??類ｋ궖????노뮉?? <BR>
	 * ??볥┛甕곕벡? yyyy-mm-dd <BR>
	 * 
	 * @return String yyyymmdd?類κ묶???袁⑹삺 ??볥럢??볦퍢. <BR>
	 */
	public static String getToday() {
		return getCurrentDate("");
	}

	/**
	 * ?袁⑹삺(??볥럢疫꿸퀣?) ?醫롮??類ｋ궖????노뮉?? <BR>
	 * ??볥┛甕곕벡? yyyy-mm-dd <BR>
	 * 
	 * @return String yyyymmdd?類κ묶???袁⑹삺 ??볥럢??볦퍢. <BR>
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
			strDate = convertDate(strDate, SIMPLE_DATE_PATTERN, dateType, "");
		}

		return strDate;
	}

	/**
	 * ?醫롮??類κ묶??String???醫롮? ???롳쭕??뱽 癰궰野껋?鍮?雅뚯눖??筌롫뗄苑??
	 * 
	 * @param sDate      ?醫롮?
	 * @param sTime      ??볦퍢
	 * @param sFormatStr ??캡 ??쎈뱜筌??얜챷???
	 * @return 筌왖?類λ립 ?醫롮?/??볦퍢??筌왖?類λ립 ?????곗쨮 ?곗뮆??
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
	 * ??낆젾獄쏆룇? ??깆쁽 ??????袁⑹벥????깆쁽??獄쏆꼹??
	 * 
	 * @param sDate1 ??뽰삂??깆쁽
	 * @param sDate2 ?ル굝利??깆쁽
	 * @return ?袁⑹벥??깆쁽
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

		// ??뺣쑁?얜챷???? ?귐뗪쉘
		return randomDate;
	}

	/**
	 * ??낆젾獄쏆룇? ?臾먯젾??깆쁽??癰궰??묐릭?????젾??깆쁽嚥?獄쏆꼹??
	 * 
	 * @param sDate ?臾먯젾??깆쁽
	 * @return ???젾??깆쁽
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
	 * ??낆젾獄쏆룇? ???젾??깆쁽??癰궰??묐릭???臾먯젾??깆쁽嚥?獄쏆꼹??
	 * 
	 * @param sDate      ???젾??깆쁽
	 * @param iLeapMonth ???젾??삳뼎???(IS_LEAP_MONTH)
	 * @return ?臾먯젾??깆쁽
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
	 * Converts week string to display string.
	 * 
	 * @param sWeek Week string (SUN, MON, etc)
	 * @return Display string
	 */
	public static String convertWeek(String sWeek) {
		String retStr = null;

		if (sWeek.equals("SUN")) {
			retStr = "Sunday";
		} else if (sWeek.equals("MON")) {
			retStr = "Monday";
		} else if (sWeek.equals("TUE")) {
			retStr = "Tuesday";
		} else if (sWeek.equals("WED")) {
			retStr = "Wednesday";
		} else if (sWeek.equals("THR")) {
			retStr = "Thursday";
		} else if (sWeek.equals("FRI")) {
			retStr = "Friday";
		} else if (sWeek.equals("SAT")) {
			retStr = "Saturday";
		}

		return retStr;
	}

	/**
	 * Validates date string.
	 * 
	 * @param sDate Date string
	 * @return true if valid
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
	 * ??낆젾??깆쁽, ?遺우뵬???醫륁뒞 ??????類ㅼ뵥
	 * 
	 * @param sDate ??깆쁽
	 * @param sWeek ?遺우뵬 (DAY_OF_WEEK)
	 * @return ?醫륁뒞 ???
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
	 * ??낆젾??볦퍢???醫륁뒞 ??????類ㅼ뵥
	 * 
	 * @param sTime ??낆젾??볦퍢
	 * @return ?醫륁뒞 ???
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
	 * ??낆젾????깆쁽???? ?? ??깆뱽 揶쎛揶쏅?釉??醫롮????遺우뵬??獄쏆꼹??
	 * 
	 * @param sDate ?醫롮?
	 * @param year  ??
	 * @param month ??
	 * @param day   ??
	 * @return ?④쑴沅????깆쁽???遺우뵬(DAY_OF_WEEK)
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
	 * ??낆젾????깆쁽???? ?? ?? ??볦퍢, ?브쑴??揶쎛揶쏅?釉??醫롮?, ??볦퍢????캡??쎈뱜筌??類ㅻ뻼??곗쨮 獄쏆꼹??
	 * 
	 * @param sDate     ?醫롮?
	 * @param sTime     ??볦퍢
	 * @param year      ??
	 * @param month     ??
	 * @param day       ??
	 * @param hour      ??볦퍢
	 * @param minute    ??
	 * @param formatStr ??캡??쎈뱜筌?
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
	 * ??낆젾????깆쁽??int ?類ㅼ몵嚥?獄쏆꼹??
	 * 
	 * @param sDate ??깆쁽
	 * @return int(??깆쁽)
	 */
	public static int datetoInt(String sDate) {
		return Integer.parseInt(convertDate(sDate, "0000", SIMPLE_DATE_PATTERN));
	}

	/**
	 * ??낆젾????볦퍢??int ?類ㅼ몵嚥?獄쏆꼹??
	 * 
	 * @param sTime ??볦퍢
	 * @return int(??볦퍢)
	 */
	public static int timetoInt(String sTime) {
		return Integer.parseInt(convertDate("00000101", sTime, "HHmm"));
	}

	/**
	 * ??낆젾????깆쁽 ?얜챷???곸뱽 ?類ㅼ뵥??랁?8?癒?봺嚥??귐뗪쉘
	 * 
	 * @param dateStr
	 * @return
	 */
	public static String validChkDate(String dateStr) {
		if (dateStr == null || dateStr.trim().isEmpty()) {
			return dateStr;
		}
		if (!(dateStr.trim().length() == 4 || dateStr.trim().length() == 8 || dateStr.trim().length() == 10)) {
			throw new IllegalArgumentException("Invalid date format: " + dateStr);
		}

		if (dateStr.length() == 10) {
			return EgovStringUtil.removeMinusChar(dateStr);
		}

		return dateStr;
	}

	/**
	 * ??낆젾????깆쁽 ?얜챷???곸뱽 ?類ㅼ뵥??랁?8?癒?봺嚥??귐뗪쉘
	 * 
	 * @param timeStr
	 * @return
	 */
	public static String validChkTime(String timeStr) {
		if (timeStr == null || timeStr.trim().isEmpty()) {
			return timeStr;
		}
		if (!(timeStr.trim().length() == 4 || timeStr.trim().length() == 6)) {
			throw new IllegalArgumentException("Invalid time format: " + timeStr);
		}

		if (timeStr.length() == 5) {
			return EgovStringUtil.remove(timeStr, ':');
		}

		return timeStr;
	}

}
