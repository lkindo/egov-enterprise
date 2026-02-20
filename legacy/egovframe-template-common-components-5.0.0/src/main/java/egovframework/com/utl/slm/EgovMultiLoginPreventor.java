package egovframework.com.utl.slm;

import java.util.Enumeration;
import java.util.concurrent.ConcurrentHashMap;

import jakarta.servlet.http.HttpSession;

/**
 * @Class Name : EgovMultiLoginPreventor.java
 * @Description : 以묐났 濡쒓렇??諛⑹?瑜??꾪빐 ?ъ슜?먯쓽 濡쒓렇???꾩씠?붿? ?몄뀡 ?꾩씠?붾? 愿由ы븯??援ы쁽 ?대옒??
 * @Modification Information
 *
 *    ?섏젙??        ?섏젙??        ?섏젙?댁슜
 *    -------        -------     -------------------
 *    2014.09.30	?쒖??꾨젅?꾩썙??	理쒖큹?앹꽦
* @author YJ Kwon
 * @since 2014.09.30
 * @version 3.5
 */
public class EgovMultiLoginPreventor {

	public static ConcurrentHashMap<String, HttpSession> loginUsers = new ConcurrentHashMap<>();

	/**
	 * ?ъ슜?먯쓽 濡쒓렇???꾩씠?붾줈 ?앹꽦???몄뀡???덈뒗吏瑜??뺤씤?쒕떎
	 * */
	public static boolean findByLoginId(String loginId) {
		return loginUsers.containsKey(loginId);
	}

	/**
	 * ?ъ슜?먯쓽 濡쒓렇???꾩씠?붾줈 ?대? 議댁옱?섎뒗 ?몄뀡??臾댄슚?뷀븳??
	 * */
	public static void invalidateByLoginId(String loginId) {
		Enumeration<String> e = loginUsers.keys();
		while (e.hasMoreElements()) {
			String key = e.nextElement();
			if (key.equals(loginId)) {
				loginUsers.get(key).invalidate();
			}
		}
	}
}
