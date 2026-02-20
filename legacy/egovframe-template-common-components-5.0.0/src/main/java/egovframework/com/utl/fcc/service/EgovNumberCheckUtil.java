package egovframework.com.utl.fcc.service;

/**
 * 踰덊샇?좏슚?깆껜???????Util ?대옒??
 * 
 * @author 怨듯넻而댄룷?뚰듃 媛쒕컻? ?ㅼ꽦濡?
 * @since 2009.06.10
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.06.10  ?ㅼ꽦濡?         理쒖큹 ?앹꽦
 *   2012.02.27  ?닿린??         踰뺤씤踰덊샇 泥댄겕濡쒖쭅 ?섏젙
 *   2025.09.02  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *   2025.09.02  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-UselessParentheses(遺덊븘?뷀븳 愿꾪샇?ъ슜)
 *
 *      </pre>
 */
public class EgovNumberCheckUtil {

	/**
	 * <p>
	 * XXXXXX - XXXXXXX ?뺤떇??二쇰?踰덊샇 ?? ??臾몄옄??2媛??낅젰 諛쏆븘 ?좏슚??二쇰?踰덊샇?몄? 寃??
	 * </p>
	 *
	 *
	 * @param 6?먮━ 二쇰??욌쾲??臾몄옄??, 7?먮━ 二쇰??룸쾲??臾몄옄??
	 * @return ?좏슚??二쇰?踰덊샇?몄? ?щ? (True/False)
	 */
	public static boolean checkJuminNumber(String jumin1, String jumin2) {

		String juminNumber = jumin1 + jumin2;
		String iDAdd = "234567892345"; // 二쇰??깅줉踰덊샇??媛?고븷 媛?

		int countNum = 0;
		int addNum = 0;
		int totalId = 0; // 寃利앹쓣 ?꾪븳 蹂?섏꽑??

		if (juminNumber.length() != 13) {
			return false; // 二쇰??깅줉踰덊샇 ?먮━?섍? 留욌뒗媛瑜??뺤씤
		}

		for (int i = 0; i < 12; i++) {
			if (juminNumber.charAt(i) < '0' || juminNumber.charAt(i) > '9') {
				return false; // ?レ옄媛 ?꾨땶 媛믪씠 ?ㅼ뼱?붾뒗吏瑜??뺤씤
			}
			countNum = Character.getNumericValue(juminNumber.charAt(i));
			addNum = Character.getNumericValue(iDAdd.charAt(i));
			totalId += countNum * addNum; // ?좏슚?먮━ 寃利앹떇???곸슜
		}

		if (Character.getNumericValue(juminNumber.charAt(0)) == 0
				|| Character.getNumericValue(juminNumber.charAt(0)) == 1) {
			if (Character.getNumericValue(juminNumber.charAt(6)) > 4) {
				return false;
			}
			String temp = "20" + juminNumber.substring(0, 6);
			if (!EgovDateUtil.checkDate(temp)) {
				return false;
			}
		} else {
			if (Character.getNumericValue(juminNumber.charAt(6)) > 2) {
				return false;
			}
			String temp = "19" + juminNumber.substring(0, 6);
			if (!EgovDateUtil.checkDate(temp)) {
				return false;
			}
		} // 二쇰?踰덊샇 ?욎옄由??좎쭨?좏슚?깆껜??& ?깅퀎援щ텇 ?レ옄 泥댄겕

		if (Character.getNumericValue(juminNumber.charAt(12)) == (11 - (totalId % 11)) % 10) { // 留덉?留??좏슚?レ옄? 寃利앹떇???듯븳 媛믪쓽
																								// 鍮꾧탳
			return true;
		} else { // 留덉?留??좏슚?レ옄? 寃利앹떇???듯븳 媛믪쓽 鍮꾧탳
			return false;
		}
	}

	/**
	 * <p>
	 * XXXXXXXXXXXXX ?뺤떇??13?먮━ 二쇰?踰덊샇 1媛쒕? ?낅젰 諛쏆븘 ?좏슚??二쇰?踰덊샇?몄? 寃??
	 * </p>
	 *
	 *
	 * @param 13?먮━ 二쇰?踰덊샇 臾몄옄??
	 * @return ?좏슚??二쇰?踰덊샇?몄? ?щ? (True/False)
	 */
	public static boolean checkJuminNumber(String jumin) {

		if (jumin.length() != 13) {
			return false;
		}

		return checkJuminNumber(jumin.substring(0, 6), jumin.substring(6, 13)); // 二쇰?踰덊샇
	}

	/**
	 * <p>
	 * XXXXXX - XXXXXXX ?뺤떇??踰뺤씤踰덊샇 ?? ??臾몄옄??2媛??낅젰 諛쏆븘 ?좏슚??踰뺤씤踰덊샇?몄? 寃??
	 * </p>
	 *
	 *
	 * @param 6?먮━ 踰뺤씤?욌쾲??臾몄옄??, 7?먮━ 踰뺤씤?룸쾲??臾몄옄??
	 * @return ?좏슚??踰뺤씤踰덊샇?몄? ?щ? (True/False)
	 */
	public static boolean checkBubinNumber(String bubin1, String bubin2) {

		String bubinNumber = bubin1 + bubin2;

		int hap = 0;
		int temp = 1; // ?좏슚寃利앹떇???ъ슜?섍린 ?꾪븳 蹂??

		if (bubinNumber.length() != 13) {
			return false; // 踰뺤씤踰덊샇???먮━?섍? 留욌뒗 吏瑜??뺤씤
		}

		for (int i = 0; i < 13; i++) {
			if (bubinNumber.charAt(i) < '0' || bubinNumber.charAt(i) > '9') { // ?レ옄媛 ?꾨땶 媛믪씠 ?ㅼ뼱?붾뒗吏瑜??뺤씤
				return false;
			}
		}

		// 2012.02.27 踰뺤씤踰덊샇 泥댄겕濡쒖쭅 ?섏젙( i<13 -> i<12 )
		// 留⑤걹 ?먮━ ?섎뒗 ?꾩궛?쒖뒪?쒖쑝濡??ㅻ쪟瑜?寃利앺븯湲??꾪빐 遺?щ릺??寃利앸쾲?몄엫
		for (int i = 0; i < 12; i++) {
			if (temp == 3) {
				temp = 1;
			}
			hap = hap + (Character.getNumericValue(bubinNumber.charAt(i)) * temp);
			temp++;
		} // 寃利앹쓣 ?꾪븳 ?앹쓽 怨꾩궛

		if ((10 - (hap % 10)) % 10 == Character.getNumericValue(bubinNumber.charAt(12))) { // 留덉?留??좏슚?レ옄? 寃利앹떇???듯븳 媛믪쓽 鍮꾧탳
			return true;
		} else { // 留덉?留??좏슚?レ옄? 寃利앹떇???듯븳 媛믪쓽 鍮꾧탳
			return false;
		}
	}

	/**
	 * <p>
	 * XXXXXXXXXXXXX ?뺤떇??13?먮━ 踰뺤씤踰덊샇 1媛쒕? ?낅젰 諛쏆븘 ?좏슚??踰뺤씤踰덊샇?몄? 寃??
	 * </p>
	 *
	 *
	 * @param 13?먮━ 踰뺤씤踰덊샇 臾몄옄??
	 * @return ?좏슚??踰뺤씤踰덊샇?몄? ?щ? (True/False)
	 */
	public static boolean checkBubinNumber(String bubin) {

		if (bubin.length() != 13) {
			return false;
		}

		return checkBubinNumber(bubin.substring(0, 6), bubin.substring(6, 13));
	}

	/**
	 * <p>
	 * xxx - xx - xxxx ?뺤떇???ъ뾽?먮쾲????以묎컙, ??臾몄옄??3媛??낅젰 諛쏆븘 ?좏슚???ъ뾽?먮쾲?몄씤吏 寃??
	 * </p>
	 *
	 *
	 * @param 3?먮━ ?ъ뾽?먯븵踰덊샇 臾몄옄??, 2?먮━ ?ъ뾽?먯쨷媛꾨쾲??臾몄옄?? 5?먮━ ?ъ뾽?먮뮮踰덊샇 臾몄옄??
	 * @return ?좏슚???ъ뾽?먮쾲?몄씤吏 ?щ? (True/False)
	 */
	public static boolean checkCompNumber(String comp1, String comp2, String comp3) {

		String compNumber = comp1 + comp2 + comp3;

		int hap = 0;
		int temp = 0;
		int check[] = { 1, 3, 7, 1, 3, 7, 1, 3, 5 }; // ?ъ뾽?먮쾲???좏슚??泥댄겕 ?꾩슂????

		if (compNumber.length() != 10) { // ?ъ뾽?먮쾲?몄쓽 湲몄씠媛 留욌뒗吏瑜??뺤씤?쒕떎.
			return false;
		}

		for (int i = 0; i < 9; i++) {
			if (compNumber.charAt(i) < '0' || compNumber.charAt(i) > '9') { // ?レ옄媛 ?꾨땶 媛믪씠 ?ㅼ뼱?붾뒗吏瑜??뺤씤?쒕떎.
				return false;
			}

			hap = hap + (Character.getNumericValue(compNumber.charAt(i)) * check[temp]); // 寃利앹떇 ?곸슜
			temp++;
		}

		hap += Character.getNumericValue(compNumber.charAt(8)) * 5 / 10;

		if ((10 - (hap % 10)) % 10 == Character.getNumericValue(compNumber.charAt(9))) { // 留덉?留??좏슚?レ옄? 寃利앹떇???듯븳 媛믪쓽 鍮꾧탳
			return true;
		} else { // 留덉?留??좏슚?レ옄? 寃利앹떇???듯븳 媛믪쓽 鍮꾧탳
			return false;
		}
	}

	/**
	 * <p>
	 * XXXXXXXXXX ?뺤떇??10?먮━ ?ъ뾽?먮쾲??3媛쒕? ?낅젰 諛쏆븘 ?좏슚???ъ뾽?먮쾲?몄씤吏 寃??
	 * </p>
	 *
	 *
	 * @param 10?먮━ ?ъ뾽?먮쾲??臾몄옄??
	 * @return ?좏슚???ъ뾽?먮쾲?몄씤吏 ?щ? (True/False)
	 */
	public static boolean checkCompNumber(String comp) {

		if (comp.length() != 10) {
			return false;
		}
		return checkCompNumber(comp.substring(0, 3), comp.substring(3, 5), comp.substring(5, 10));
	}

	/**
	 * <p>
	 * XXXXXX - XXXXXXX ?뺤떇???멸뎅?몃벑濡앸쾲???? ??臾몄옄??2媛??낅젰 諛쏆븘 ?좏슚???멸뎅?몃벑濡앸쾲?몄씤吏 寃??
	 * </p>
	 *
	 *
	 * @param 6?먮━ ?멸뎅?몃벑濡앹븵踰덊샇 臾몄옄??, 7?먮━ ?멸뎅?몃벑濡앸뮮踰덊샇 臾몄옄??
	 * @return ?좏슚???멸뎅?몃벑濡앸쾲?몄씤吏 ?щ? (True/False)
	 */
	public static boolean checkForeignNumber(String foreign1, String foreign2) {

		String foreignNumber = foreign1 + foreign2;
		int check = 0;

		if (foreignNumber.length() != 13) { // ?멸뎅?몃벑濡앸쾲?몄쓽 湲몄씠媛 留욌뒗吏 ?뺤씤?쒕떎.
			return false;
		}

		for (int i = 0; i < 13; i++) {
			if (foreignNumber.charAt(i) < '0' || foreignNumber.charAt(i) > '9') { // ?レ옄媛 ?꾨땶 媛믪씠 ?ㅼ뼱?붾뒗吏瑜??뺤씤?쒕떎.
				return false;
			}
		}

		if (Character.getNumericValue(foreignNumber.charAt(0)) == 0
				|| Character.getNumericValue(foreignNumber.charAt(0)) == 1
				|| Character.getNumericValue(foreignNumber.charAt(0)) == 2) {
			if (Character.getNumericValue(foreignNumber.charAt(6)) == 5
					|| Character.getNumericValue(foreignNumber.charAt(6)) == 6) {
				return false;
			}
			String temp = "20" + foreignNumber.substring(0, 6);
			if (!EgovDateUtil.checkDate(temp)) {
				return false;
			}
		} else {
			if (Character.getNumericValue(foreignNumber.charAt(6)) == 7
					|| Character.getNumericValue(foreignNumber.charAt(6)) == 8) {
				return false;
			}
			String temp = "19" + foreignNumber.substring(0, 6);
			if (!EgovDateUtil.checkDate(temp)) {
				return false;
			}
		} // ?멸뎅?몃벑濡앸쾲???욎옄由??좎쭨?좏슚?깆껜??& ?깅퀎援щ텇 ?レ옄 泥댄겕

		for (int i = 0; i < 12; i++) {
			check += ((9 - i % 8) * Character.getNumericValue(foreignNumber.charAt(i)));
		}

		if (check % 11 == 0) {
			check = 1;
		} else if (check % 11 == 10) {
			check = 0;
		} else {
			check = check % 11;
		}

		if (check + 2 > 9) {
			check = check + 2 - 10;
		} else {
			check = check + 2; // 寃利앹떇???듯빀 媛믪쓽 ?꾩텧
		}

		if (check == Character.getNumericValue(foreignNumber.charAt(12))) { // 留덉?留??좏슚?レ옄? 寃利앹떇???듯븳 媛믪쓽 鍮꾧탳
			return true;
		} else { // 留덉?留??좏슚?レ옄? 寃利앹떇???듯븳 媛믪쓽 鍮꾧탳
			return false;
		}
	}

	/**
	 * <p>
	 * XXXXXXXXXXXXX ?뺤떇??13?먮━ ?멸뎅?몃벑濡앸쾲??1媛쒕? ?낅젰 諛쏆븘 ?좏슚???멸뎅?몃벑濡앸쾲?몄씤吏 寃??
	 * </p>
	 *
	 *
	 * @param 13?먮━ ?멸뎅?몃벑濡앸쾲??臾몄옄??
	 * @return ?좏슚???멸뎅?몃벑濡앸쾲?몄씤吏 ?щ? (True/False)
	 */
	public static boolean checkForeignNumber(String foreign) {

		if (foreign.length() != 13) {
			return false;
		}
		return checkForeignNumber(foreign.substring(0, 6), foreign.substring(6, 13));
	}
}
