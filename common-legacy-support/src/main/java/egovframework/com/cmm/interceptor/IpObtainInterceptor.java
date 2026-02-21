package egovframework.com.cmm.interceptor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.servlet.HandlerInterceptor;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.utl.sim.service.EgovClntInfo;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * ???? ????
 * 
 * @author ????? ????
 * @since 2013.03.28
 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *
 *   ????    ????         ????
 *  ----------  --------    ---------------------------
 *  2013.03.28	????         ????
 *      </pre>
 **/

public class IpObtainInterceptor implements HandlerInterceptor {

	private static final Logger LOGGER = LoggerFactory.getLogger(IpObtainInterceptor.class);

	@Override
	public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
			throws Exception {

		LOGGER.debug("### IpObtainInterceptor start...");

		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		if (loginVO != null) {
			loginVO.setIp(EgovClntInfo.getClntIP(request));
		}

		return true;
	}
}
