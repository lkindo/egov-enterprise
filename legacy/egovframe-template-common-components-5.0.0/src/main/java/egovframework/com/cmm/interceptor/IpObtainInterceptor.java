package egovframework.com.cmm.interceptor;

import org.springframework.web.servlet.HandlerInterceptor;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.utl.sim.service.EgovClntInfo;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * ?ъ슜?륤P 泥댄겕 ?명꽣?됲꽣
 * @author ?좎?蹂댁닔? ?닿린??
 * @since 2013.03.28
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??    ?섏젙??         ?섏젙?댁슜
 *  ----------  --------    ---------------------------
 *  2013.03.28	?닿린??         理쒖큹 ?앹꽦
 *  </pre>
 */

public class IpObtainInterceptor implements HandlerInterceptor {

	@Override
	public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {

		System.out.println("### IpObtainInterceptor start... ");
		
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		if (loginVO != null) {
			loginVO.setIp(EgovClntInfo.getClntIP(request));
		}

		return true;
	}
}
