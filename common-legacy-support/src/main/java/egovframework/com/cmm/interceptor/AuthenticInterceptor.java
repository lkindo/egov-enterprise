package egovframework.com.cmm.interceptor;

import java.util.Collections;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.ModelAndView;
import org.springframework.web.servlet.ModelAndViewDefiningException;

import egovframework.com.cmm.util.EgovUserDetailsHelper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * ???? ????
 * 
 * @author ???????? ?????
 * @since 2011.07.01
 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????         ????
 *  -------    --------    ---------------------------
 *  2011.07.01  ?????         ????
 *  2011.09.07  ?????         ?????? URL?????? ???
 *  2017.08.31  ???         ????????? ???? ?????
 *  2021.08.27  ???         dummy??????"60. ??? ??? ??
 *      </pre>
 **/

public class AuthenticInterceptor implements HandlerInterceptor {

	@SuppressWarnings("unused")
	@Autowired
	private Environment environment;

	/** ?? ? ???? ?**/
	private List<String> adminAuthPatternList;

	/** ?? ? ???? ??**/
	private List<AntPathRequestMatcher> adminAuthMatchers;

	public List<String> getAdminAuthPatternList() {
		return adminAuthPatternList;
	}

	public void setAdminAuthPatternList(List<String> adminAuthPatternList) {
		this.adminAuthPatternList = Collections.unmodifiableList(adminAuthPatternList);
		this.adminAuthMatchers = new java.util.ArrayList<>();
		for (String pattern : this.adminAuthPatternList) {
			this.adminAuthMatchers.add(new AntPathRequestMatcher(pattern));
		}
	}

	/**
	 * ????????????? ???????.
	 * ?? ??? ? ?? ????.
	 **/
	@Override
	public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
			throws Exception {
		// ????? ???
		boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		// ??? ?
		if (!isAuthenticated) {
			ModelAndView modelAndView = new ModelAndView("redirect:/uat/uia/egovLoginUsr.do");
			throw new ModelAndViewDefiningException(modelAndView);
		}
		// ?????
		List<String> authList = EgovUserDetailsHelper.getAuthorities();
		// ??????
		boolean adminAuthUrlPatternMatcher = false;
		// ?? ?????
		if (adminAuthMatchers != null) {
			for (AntPathRequestMatcher matcher : adminAuthMatchers) {
				if (matcher.matches(request)) {
					adminAuthUrlPatternMatcher = true;
					break;
				}
			}
		}
		// ?? ??
		if (adminAuthUrlPatternMatcher && !authList.contains("ROLE_ADMIN")) {
			ModelAndView modelAndView = new ModelAndView("redirect:/uat/uia/egovLoginUsr.do?auth_error=1");
			throw new ModelAndViewDefiningException(modelAndView);
		}
		return true;
	}

}
