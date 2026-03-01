**
 * @Class Name  : EgovNumberUtil.java
 * @Description : ?レ옄 ?곗씠??泥섎━ 愿???좏떥由ы떚
 * @Modification Information
 *
 *     ?섏젙??        ?섏젙??                  ?섏젙?댁슜
 *     -------          --------        ---------------------------
 *   2009.02.13       ?댁궪??                 理쒖큹 ?앹꽦
 *
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? ?댁궪??
 * @since 2009. 02. 13
 * @version 1.0
 * @see
 *
 */

package egovframework.com.utl.fcc.service;

import java.security.SecureRandom;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class EgovNumberUtil {

	// 221116	源?쒖?	2022 ?쒗걧?댁퐫??議곗튂
	private static SecureRandom rnd = new SecureRandom();

	/**
	 * ?뱀젙?レ옄 吏묓빀?먯꽌 ?쒕뜡 ?レ옄瑜?援ы븯??湲곕뒫 ?쒖옉?レ옄? 醫낅즺?レ옄 ?ъ씠?먯꽌 援ы븳 ?쒕뜡 ?レ옄瑜?諛섑솚?쒕떎
	 *
	 * @param startNum - ?쒖옉?レ옄
	 * @param endNum - 醫낅즺?レ옄
	 * @return ?쒕뜡?レ옄
	 * @see
	 */
	public static int getRandomNum(int startNum, int endNum) {
		int randomNum = 0;

		do {
			// 醫낅즺?レ옄?댁뿉???쒕뜡 ?レ옄瑜?諛쒖깮?쒗궓??
			randomNum = rnd.nextInt(endNum + 1);
		} while (randomNum < startNum); // ?쒕뜡 ?レ옄媛 ?쒖옉?レ옄蹂대떎 ?묒쓣寃쎌슦 ?ㅼ떆 ?쒕뜡?レ옄瑜?諛쒖깮?쒗궓??

		return randomNum;
	}

	/**
	 * ?뱀젙 ?レ옄 吏묓빀?먯꽌 ?뱀젙 ?レ옄媛 ?덈뒗吏 泥댄겕?섎뒗 湲곕뒫 12345678?먯꽌 7???덈뒗吏 ?녿뒗吏 泥댄겕?섎뒗 湲곕뒫???쒓났??
	 *
	 * @param sourceInt - ?뱀젙?レ옄吏묓빀
	 * @param searchInt - 寃?됱닽??
	 * @return 議댁옱?щ?
	 * @see
	 */
	public static Boolean getNumSearchCheck(int sourceInt, int searchInt) {
		String sourceStr = String.valueOf(sourceInt);
		String searchStr = String.valueOf(searchInt);

		// ?뱀젙?レ옄媛 議댁옱?섎뒗吏 ?섏뿬 ?꾩튂媛믪쓣 由ы꽩?쒕떎. ?놁쓣 ??-1
		if (sourceStr.indexOf(searchStr) == -1) {
			return false;
		} else {
			return true;
		}
	}

	/**
	 * ?レ옄??낆쓣 臾몄옄?대줈 蹂?섑븯??湲곕뒫 ?レ옄 20081212瑜?臾몄옄??'20081212'濡?蹂?섑븯??湲곕뒫
	 *
	 * @param srcNumber - ?レ옄
	 * @return 臾몄옄??
	 * @see
	 */
	public static String getNumToStrCnvr(int srcNumber) {
		String rtnStr = null;

		rtnStr = String.valueOf(srcNumber);

		return rtnStr;
	}

	/**
	 * ?レ옄??낆쓣 ?곗씠????낆쑝濡?蹂?섑븯??湲곕뒫
	 * ?レ옄 20081212瑜??곗씠?명??? '2008-12-12'濡?蹂?섑븯??湲곕뒫
	 * @param srcNumber - ?レ옄
	 * @return String
	 * @see
	 */
	public static String getNumToDateCnvr(int srcNumber) {

		String pattern = null;
		String cnvrStr = null;

		String srcStr = String.valueOf(srcNumber);

		// Date ?뺥깭??8?먮━ 諛?14?먮━留??뺤긽泥섎━
		if (srcStr.length() != 8 && srcStr.length() != 14) {
			throw new IllegalArgumentException("Invalid Number: " + srcStr + " Length=" + srcStr.trim().length());
		}

		if (srcStr.length() == 8) {
			pattern = "yyyyMMdd";
		} else if (srcStr.length() == 14) {
			pattern = "yyyyMMddhhmmss";
		}

		SimpleDateFormat dateFormatter = new SimpleDateFormat(pattern, Locale.KOREA);

		Date cnvrDate = null;

		try {
			cnvrDate = dateFormatter.parse(srcStr);
		} catch (ParseException e) {
			throw new RuntimeException(e);
		}

		cnvrStr = String.format("%1$tY-%1$tm-%1$td", cnvrDate);

		return cnvrStr;

	}

	/**
	 * 泥댄겕???レ옄 以묒뿉???レ옄?몄? ?꾨땶吏 泥댄겕?섎뒗 湲곕뒫
	 * ?レ옄?대㈃ True, ?꾨땲硫?False瑜?諛섑솚?쒕떎
	 * @param checkStr - 泥댄겕臾몄옄??
	 * @return ?レ옄?щ?
	 * @see
	 */
	public static Boolean getNumberValidCheck(String checkStr) {

		int i;
		//String sourceStr = String.valueOf(sourceInt);

		int checkStrLt = checkStr.length();

		for (i = 0; i < checkStrLt; i++) {

			// ?꾩뒪?ㅼ퐫?쒓컪( '0'-> 48, '9' -> 57)
			if (checkStr.charAt(i) > 47 && checkStr.charAt(i) < 58) {
				continue;
			} else {
				return false;
			}
		}

		return true;
	}

	/**
	 * ?뱀젙?レ옄瑜??ㅻⅨ ?レ옄濡?移섑솚?섎뒗 湲곕뒫 ?レ옄 12345678?먯꽌 123瑜?999濡?蹂?섑븯??湲곕뒫???쒓났(99945678)
	 *
	 * @param srcNumber - ?レ옄吏묓빀
	 * @param cnvrSrcNumber - ?먮옒?レ옄
	 * @param cnvrTrgtNumber - 移섑솚?レ옄
	 * @return 移섑솚?レ옄
	 * @see
	 */
	public static int getNumberCnvr(int srcNumber, int cnvrSrcNumber, int cnvrTrgtNumber) {

		// ?낅젰諛쏆? ?レ옄瑜?臾몄옄?대줈 蹂??
		String source = String.valueOf(srcNumber);
		String subject = String.valueOf(cnvrSrcNumber);
		String object = String.valueOf(cnvrTrgtNumber);

		StringBuffer rtnStr = new StringBuffer();
		String preStr = "";
		String nextStr = source;

		// ?먮낯?レ옄?먯꽌 蹂?섎??곸닽?먯쓽 ?꾩튂瑜? 李얜뒗??
		while (source.indexOf(subject) >= 0) {
			preStr = source.substring(0, source.indexOf(subject)); // 蹂?섎??곸닽???꾩튂源뚯? ?レ옄瑜??섎씪?몃떎
			nextStr = source.substring(source.indexOf(subject) + subject.length(), source.length());
			source = nextStr;
			rtnStr.append(preStr).append(object); // 蹂?섎??곸쐞移??レ옄??蹂?섑븷 ?レ옄瑜?遺숈뿬以??
		}
		rtnStr.append(nextStr); // 蹂?섎????レ옄 ?댄썑 ?レ옄瑜?遺숈뿬以??

		return Integer.parseInt(rtnStr.toString());
	}

	/**
	 * ?뱀젙?レ옄媛 ?ㅼ닔?몄?, ?뺤닔?몄?, ?뚯닔?몄? 泥댄겕?섎뒗 湲곕뒫 123???ㅼ닔?몄?, ?뺤닔?몄?, ?뚯닔?몄? 泥댄겕?섎뒗 湲곕뒫???쒓났??
	 *
	 * @param srcNumber - ?レ옄吏묓빀
	 * @return -1(?뚯닔), 0(?뺤닔), 1(?ㅼ닔)
	 * @see
	 */
	public static int checkRlnoInteger(double srcNumber) {

		// byte 1諛붿씠??		?띠냼?섏젏???녿뒗 ?レ옄濡? 踰붿쐞 -2^7 ~ 2^7 -1
		// short 2諛붿씠??	?띠냼?섏젏???녿뒗 ?レ옄濡? 踰붿쐞 -2^15 ~ 2^15 -1
		// int 4諛붿씠??		?띠냼?섏젏???녿뒗 ?レ옄濡? 踰붿쐞 -2^31 ~ 2^31 - 1
		// long 8諛붿씠??		?띠냼?섏젏???녿뒗 ?レ옄濡? 踰붿쐞 -2^63 ~ 2^63-1

		// float 4諛붿씠??	?띠냼?섏젏???덈뒗 ?レ옄濡? ?앹뿉 F ?먮뒗 f 媛 遺숇뒗 ?レ옄 (??3.14f)
		// double 8諛붿씠???띠냼?섏젏???덈뒗 ?レ옄濡? ?앹뿉 ?꾨Т寃껊룄 遺숈? ?딅뒗 ?レ옄 (??3.14)
		//							?띠냼?섏젏???덈뒗 ?レ옄濡? ?앹뿉 D ?먮뒗 d 媛 遺숇뒗 ?レ옄(??3.14d)

		String cnvrString = null;

		if (srcNumber < 0) {
			return -1;
		} else {
			cnvrString = String.valueOf(srcNumber);

			if (cnvrString.indexOf(".") == -1) {
				return 0;
			} else {
				return 1;
			}
		}
	}
}
