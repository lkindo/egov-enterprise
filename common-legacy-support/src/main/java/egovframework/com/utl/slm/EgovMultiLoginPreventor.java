package egovframework.com.utl.slm;

import java.util.Enumeration;
import java.util.concurrent.ConcurrentHashMap;

import jakarta.servlet.http.HttpSession;

/**
 * @Class Name : EgovMultiLoginPreventor.java
 * @Description : ????????? ????? ?????? ????? ????? ?????
 * @Modification Information
 *
 *    ????        ????        ????
 *    -------        -------     -------------------
 *    2014.09.30	???????	???
* @author YJ Kwon
 * @since 2014.09.30
 * @version 3.5
 **/
public class EgovMultiLoginPreventor {

	public static ConcurrentHashMap<String, HttpSession> loginUsers = new ConcurrentHashMap<>();

	/**
	 * ????? ????? ??????????????
	 * **/
	public static boolean findByLoginId(String loginId) {
		return loginUsers.containsKey(loginId);
	}

	/**
	 * ????? ????? ??? ??? ????????
	 * **/
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
