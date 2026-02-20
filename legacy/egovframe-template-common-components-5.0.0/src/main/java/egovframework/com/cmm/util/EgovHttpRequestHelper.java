package egovframework.com.cmm.util;

import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

/**
 * @Class Name : EgovHttpRequestHelper.java
 * @Description : HTTP Request ?뺣낫 痍⑤뱷 Helper ?대옒??
 * @Modification Information
 *
 *    ?섏젙??        ?섏젙??        ?섏젙?댁슜
 *    -------        -------     -------------------
 *    2014.09.11	?쒖??꾨젅?꾩썙??	理쒖큹?앹꽦
* @author Vincent Han
 * @since 2014.09.11
 * @version 3.5
 * @see <pre>
 * web.xml ?곸뿉 ?ㅼ쓬怨?媛숈? Listener ?깅줉 ?꾩슂
 * &lt;listener&gt;
 *	  &lt;listener-class&gt;org.springframework.web.context.request.RequestContextListener&lt;/listener-class&gt;
 * &lt;/listener&gt;
 * </pre>
 */
public class EgovHttpRequestHelper {

	public static boolean isInHttpRequest() {
		try {
			getCurrentRequest();
		} catch (IllegalStateException ise) {
			return false;
		}

		return true;
	}

	public static HttpServletRequest getCurrentRequest() {
		ServletRequestAttributes sra = (ServletRequestAttributes) RequestContextHolder.currentRequestAttributes();

		return sra.getRequest();
	}

	public static String getRequestIp() {
		return getCurrentRequest().getRemoteAddr();
	}

	public static String getRequestURI() {
		return getCurrentRequest().getRequestURI();
	}

	public static HttpSession getCurrentSession() {
		return getCurrentRequest().getSession();
	}
}
