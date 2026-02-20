package egovframework.com.uat.sso.filter;

import java.io.IOException;

import org.springframework.context.ApplicationContext;
import org.springframework.web.context.support.WebApplicationContextUtils;

import egovframework.com.uat.sso.service.EgovSSOService;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.FilterConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;

/**
 *
 * @author ???????? ?????
 * @since 2011. 8. 29.
 * @version 1.0
 * @see
 *
 * <pre>
 * ?????Modification Information)
 *
 *   ????     ????         ????
 *  -------    --------    ---------------------------
 *  2011. 8. 29.    ?????       ???
 *
 *  </pre>
 **/

public class EgovSSOLogoutFilter implements Filter{
	private FilterConfig config;

	@Override
	public void destroy() {}

	@Override
	public void doFilter(ServletRequest request, ServletResponse response,
			FilterChain chain) throws IOException, ServletException {

		ApplicationContext act = WebApplicationContextUtils.getRequiredWebApplicationContext(config.getServletContext());
		EgovSSOService egovSSOService = (EgovSSOService) act.getBean("egovSSOService");

		String returnURL = config.getInitParameter("returnURL");

		((HttpServletRequest)request).getSession().setAttribute("loginVO", null);
		egovSSOService.ssoLogout(request, response, ((HttpServletRequest)request).getContextPath() + returnURL);

	}

	@Override
	public void init(FilterConfig filterConfig) throws ServletException {

		this.config = filterConfig;
	}
}
