/**
 * @Class Name  : EgovSessionUtil.java
 * @Description : ?몄뀡 泥섎━ 愿???좏떥由ы떚
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

package egovframework.com.utl.cas.service;

import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.util.Enumeration;

import egovframework.com.cmm.EgovWebUtil;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

public class EgovSessionCookieUtil {

	/**
	 * HttpSession??二쇱뼱吏???媛믪쑝濡??몄뀡 ?뺣낫瑜??앹꽦?섎뒗 湲곕뒫
	 *
	 * @param request
	 * @param keyStr - ?몄뀡 ??
	 * @param valStr - ?몄뀡 媛?
	 * @throws Exception
	 */
	public static void setSessionAttribute(HttpServletRequest request, String keyStr, String valStr) throws Exception {

		HttpSession session = request.getSession();
		session.setAttribute(keyStr, valStr);
	}

	/**
	 * HttpSession??二쇱뼱吏???媛믪쑝濡??몄뀡 媛앹껜瑜??앹꽦?섎뒗 湲곕뒫
	 *
	 * @param request - HttpServletRequest 媛앹껜
	 * @param keyStr  - ?ㅼ젙???몄뀡????
	 * @param obj     - ?ㅼ젙???몄뀡??媛?媛앹껜)
	 * @throws Exception
	 */
	public static void setSessionAttribute(HttpServletRequest request, String keyStr, Object obj) throws Exception {

		HttpSession session = request.getSession();
		session.setAttribute(keyStr, obj);
	}

	/**
	 * HttpSession??議댁옱?섎뒗 二쇱뼱吏???媛믪뿉 ?대떦?섎뒗 ?몄뀡 媛믪쓣 ?살뼱?ㅻ뒗 湲곕뒫
	 *
	 * @param request
	 * @param keyStr - ?몄뀡 ??
	 * @return
	 * @throws Exception
	 */
	public static Object getSessionAttribute(HttpServletRequest request, String keyStr) throws Exception {

		HttpSession session = request.getSession();
		return session.getAttribute(keyStr);
	}

	/**
	 * HttpSession 媛앹껜?댁쓽 紐⑤뱺 媛믪쓣 ?몄텧?섎뒗 湲곕뒫
	 *
	 * @param request
	 * @return
	 * @throws Exception
	 */
	public static String getSessionValuesString(HttpServletRequest request) throws Exception {
		HttpSession session = request.getSession();
		String returnVal = "";

		Enumeration<?> e = session.getAttributeNames();
		while (e.hasMoreElements()) {
			String sessionKey = (String)e.nextElement();
			returnVal = returnVal + "[" + sessionKey + " : " + session.getAttribute(sessionKey) + "]";
		}

		return returnVal;
	}

	/**
	 * HttpSession??議댁옱?섎뒗 ?몄뀡??二쇱뼱吏???媛믪쑝濡???젣?섎뒗 湲곕뒫
	 *
	 * @param request
	 * @param keyStr - ?몄뀡 ??
	 * @throws Exception
	 */
	public static void removeSessionAttribute(HttpServletRequest request, String keyStr) throws Exception {

		HttpSession session = request.getSession();
		session.removeAttribute(keyStr);
	}

	/**
	 * 荑좏궎?앹꽦 - ?낅젰諛쏆? 遺꾨쭔??荑좏궎瑜??좎??섎룄濡??명똿?쒕떎.
	 * 荑좏궎???좏슚?쒓컙? minute ?뚮씪誘명꽣???곕씪 ?ㅼ젙?섎ŉ, 理쒕? 24?쒓컙?쇰줈 ?쒗븳?쒕떎.
	 * ?? minute??5?대㈃, 荑좏궎???좏슚?쒓컙??5遺꾩쑝濡??ㅼ젙 =>(cookie.setMaxAge(60 * 5))
	 *
	 * @param response - Response
	 * @param cookieNm - 荑좏궎紐?
	 * @param cookieVal - 荑좏궎媛?
	 * @param minute - 吏?띿떆???쒓컙(遺? 理쒕? 24?쒓컙)
	 * @return ?놁쓬
	 * @exception UnsupportedEncodingException
	 * @see
	 */
	public static void setCookie(HttpServletResponse response, String cookieNm, String cookieVal, int minute)
		throws UnsupportedEncodingException {

		// ?뱀젙??encode 諛⑹떇???ъ슜??罹먮┃???쇱씤??application/x-www-form-urlencoded ?뺤떇?쇰줈 蹂??
		// ?쇰컲 臾몄옄?댁쓣 ?뱀뿉???듭슜?섎뒗 'x-www-form-urlencoded' ?뺤떇?쇰줈 蹂?섑븯????븷
		String cookieValue = URLEncoder.encode(cookieVal, "utf-8");

		// 荑좏궎?앹꽦 - 荑좏궎???대쫫, 荑좏궎??媛?
		Cookie cookie = new Cookie(cookieNm, cookieValue);

		cookie.setSecure(true);

		cookie.setHttpOnly(true);//2022.01. Cookie without the HttpOnly flag 泥섎━

		// 荑좏궎???좏슚?쒓컙 ?ㅼ젙
		int maxAge = 60 * minute;
		// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
		if (maxAge > 60 * 60 * 24) {
			maxAge = 60 * 60 * 24;
		}
		cookie.setMaxAge(maxAge);

		// response ?댁옣 媛앹껜瑜??댁슜??荑좏궎瑜??꾩넚
		response.addCookie(cookie);
	}

	/**
	 * 荑좏궎 ?앹꽦 諛??ㅼ젙.
	 * ??硫붿꽌?쒕? ?ъ슜?섏뿬 ?앹꽦??荑좏궎??釉뚮씪?곗? ?몄뀡 ?숈븞留??좎??⑸땲?? (?좏슚?쒓컙 ?ㅼ젙???놁쑝誘濡?
	 *
	 * @param response - ???묐떟 媛앹껜
	 * @param cookieNm - ?앹꽦??荑좏궎???대쫫
	 * @param cookieVal - ?앹꽦??荑좏궎??媛?
	 * @throws UnsupportedEncodingException - UTF-8 ?몄퐫?⑹쓣 吏?먰븯吏 ?딅뒗 寃쎌슦 諛쒖깮
	 */

	public static void setCookie(HttpServletResponse response, String cookieNm, String cookieVal)
			throws UnsupportedEncodingException {

		// ?뱀젙??encode 諛⑹떇???ъ슜??罹먮┃???쇱씤??application/x-www-form-urlencoded ?뺤떇?쇰줈 蹂??
		// ?쇰컲 臾몄옄?댁쓣 ?뱀뿉???듭슜?섎뒗 'x-www-form-urlencoded' ?뺤떇?쇰줈 蹂?섑븯????븷
		String cookieValue = URLEncoder.encode(cookieVal, "utf-8");

		// 荑좏궎 ?앹꽦 (蹂댁븞 ?꾪뿕??以꾩씠湲??꾪빐 CRLF 臾몄옄 ?쒓굅)
		Cookie cookie = new Cookie(EgovWebUtil.removeCRLF(cookieNm), EgovWebUtil.removeCRLF(cookieValue));

		// 2011.10.10 蹂댁븞?먭? ?꾩냽議곗튂
		cookie.setSecure(true);   // HTTPS?먯꽌留?荑좏궎 ?ъ슜
		cookie.setHttpOnly(true); // ?먮컮?ㅽ겕由쏀듃?먯꽌 荑좏궎 ?묎렐 諛⑹?

		cookie.setHttpOnly(true);//2022.01. Cookie without the HttpOnly flag 泥섎━

		// ?묐떟??荑좏궎 異붽?
		response.addCookie(cookie);
	}

	/**
	 * 荑좏궎媛??ъ슜 - 荑좏궎媛믪쓣 ?쎌뼱?ㅼ씤??
	 *
	 * @param request - Request
	 * @param name - 荑좏궎紐?
	 * @return 荑좏궎媛?
	 * @exception
	 * @see
	 */
	public static String getCookie(HttpServletRequest request, String cookieNm) throws Exception {

		// ???꾨찓?몄뿉???щ윭 媛쒖쓽 荑좏궎瑜??ъ슜?????덇린 ?뚮Ц??Cookie[] 諛곗뿴??諛섑솚
		// Cookie瑜??쎌뼱??Cookie 諛곗뿴濡?諛섑솚
		Cookie[] cookies = request.getCookies();

		if (cookies == null) {
			return "";
		}

		String cookieValue = null;

		// ?낅젰諛쏆? 荑좏궎紐낆쑝濡?鍮꾧탳?댁꽌 荑좏궎媛믪쓣 ?살뼱?몃떎.
		for (Cookie element : cookies) {

			if (cookieNm.equals(element.getName())) {

				// ?밸퀎??encode 諛⑹떇???ъ슜??application/x-www-form-urlencoded 罹먮┃???쇱씤???붿퐫??
				// URLEncoder濡??몄퐫?⑸맂 寃곌낵瑜??붿퐫?⑺븯???대옒??
				cookieValue = URLDecoder.decode(element.getValue(), "utf-8");

				break;
			}
		}

		return cookieValue;
	}

	/**
	 * 荑좏궎媛???젣 - cookie.setMaxAge(0) - 荑좏궎???좏슚?쒓컙??0?쇰줈 ?ㅼ젙??以뚯쑝濡쒖뜥 荑좏궎瑜???젣?섎뒗 寃껉낵 ?숈씪???④낵
	 *
	 * @param request - Request
	 * @param name - 荑좏궎紐?
	 * @return 荑좏궎媛?
	 * @exception
	 * @see
	 */
	public static void setCookie(HttpServletResponse response, String cookieNm) throws UnsupportedEncodingException {

		// 荑좏궎?앹꽦 - 荑좏궎???대쫫, 荑좏궎??媛?
		Cookie cookie = new Cookie(EgovWebUtil.removeCRLF(cookieNm), null);

		cookie.setSecure(true);

		cookie.setHttpOnly(true);//2022.01. Cookie without the HttpOnly flag 泥섎━

		// 荑좏궎瑜???젣?섎뒗 硫붿냼?쒓? ?곕줈 議댁옱?섏? ?딆쓬
		// 荑좏궎???좏슚?쒓컙??0?쇰줈 ?ㅼ젙??以뚯쑝濡쒖뜥 荑좏궎瑜???젣?섎뒗 寃껉낵 ?숈씪???④낵
		cookie.setMaxAge(0);

		// response ?댁옣 媛앹껜瑜??댁슜??荑좏궎瑜??꾩넚
		response.addCookie(cookie);
	}
}