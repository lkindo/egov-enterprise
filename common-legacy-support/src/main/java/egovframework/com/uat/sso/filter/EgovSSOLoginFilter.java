package egovframework.com.uat.sso.filter;

import java.io.IOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.NoSuchBeanDefinitionException;
import org.springframework.context.ApplicationContext;
import org.springframework.util.ObjectUtils;
import org.springframework.web.context.support.WebApplicationContextUtils;

import egovframework.com.cmm.LoginVO;
import egovframework.com.uat.sso.service.EgovSSOService;
import egovframework.com.uat.uia.service.EgovLoginService;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.FilterConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

/**
 * Egov SSO ????
 * 
 * @author ???????? ?????
 * @since 2011.08.02
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2011.08.02  ?????         ????
 *   2025.07.29  ????         2025????????PMD???????? ????????-UncommentedEmptyMethodBody(????? ?????? ??????????????
 *   2025.07.29  ????         2025????????PMD???????? ????????-UselessParentheses(?????????
 *
 *      </pre>
 **/
public class EgovSSOLoginFilter implements Filter {

	private FilterConfig config;

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovSSOLoginFilter.class);

	@Override
	public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
			throws IOException, ServletException {

		ApplicationContext act = WebApplicationContextUtils
				.getRequiredWebApplicationContext(config.getServletContext());
		EgovSSOService egovSSOService = null;
		try {
			egovSSOService = (EgovSSOService) act.getBean("egovSSOService");
			// 221116 ??? 2022 ????????
			if (ObjectUtils.isEmpty(egovSSOService)) {
				LOGGER.error("Fail to create 'EgovSSOService' object");
				chain.doFilter(request, response);
				return;
			}
		} catch (NoSuchBeanDefinitionException ex) {
			LOGGER.error("No SSO ServiceImpl Class!");
		}

		EgovLoginService loginService = (EgovLoginService) act.getBean("loginService");

		HttpServletRequest httpRequest = (HttpServletRequest) request;
		HttpSession session = httpRequest.getSession();
		String isLocallyAuthenticated = (String) session.getAttribute("isLocallyAuthenticated");
		String isRemotelyAuthenticated = (String) session.getAttribute("isRemotelyAuthenticated");
		boolean isSSOLoggedOn = false;

		if (isLocallyAuthenticated != null && isLocallyAuthenticated.equals("true")) {
			if (isRemotelyAuthenticated == null) {
				try {
					if (egovSSOService != null) {// 2022.01 Null pointers should not be dereferenced
						// sso????? ??
						egovSSOService.requestIssueToken(request, response);
						// sso ? ? ????????????
						session.setAttribute("isRemotelyAuthenticated", "true");
					} else {
						LOGGER.debug("EgovSSOService is null, skipping SSO token issuance.");
						session.setAttribute("isRemotelyAuthenticated", "fail");
					}

					// ?? ? ??? ??????????
					session.setAttribute("isLocallyAuthenticated", "true");

				} catch (IllegalStateException ex) {// KISA ?? ??(2018-10-29, ????
					session.setAttribute("isRemotelyAuthenticated", "fail");
					LOGGER.debug("SSO Authentication fail : invalidated session {}", ex.getMessage());
				} catch (Exception ex) {
					session.setAttribute("isRemotelyAuthenticated", "fail");
					LOGGER.debug("SSO Authentication fail : {}", ex.getMessage());
				}

			}
		} else if (isLocallyAuthenticated == null) {
			if (isRemotelyAuthenticated == null) {
				if (egovSSOService != null) {// 2022.01 Null pointers should not be dereferenced
					// sso?????????? ??
					isSSOLoggedOn = egovSSOService.hasTokenInSSOServer(httpRequest, response);
					if (isSSOLoggedOn) {
						// ????????????????? isRemotelyAuthenticated true??
						session.setAttribute("isRemotelyAuthenticated", "true");

						// ?DB???? loginVO ????????
						session.setAttribute("loginVOForDBAuthentication",
								egovSSOService.getLoginVO(request, response));
					}
				}
			}
		}

		chain.doFilter(request, response);

		isLocallyAuthenticated = (String) session.getAttribute("isLocallyAuthenticated");
		isRemotelyAuthenticated = (String) session.getAttribute("isRemotelyAuthenticated");

		if (isLocallyAuthenticated == null) {
			if (isRemotelyAuthenticated != null && isRemotelyAuthenticated.equals("true")) {
				try {
					// ??? ?????DB????????????
					LoginVO loginVO = (LoginVO) session.getAttribute("loginVOForDBAuthentication");
					loginVO = loginService.actionLoginByEsntlId(loginVO);
					if (loginVO != null && loginVO.getId() != null && !loginVO.getId().equals("")) {
						// ?????
						session.setAttribute("loginVO", loginVO);

						// ???????????
						session.setAttribute("isLocallyAuthenticated", "true");
					} else {
						LOGGER.debug("Local authentication by sso is failed");
					}
				} catch (IllegalStateException ex) {// KISA ?? ??(2018-10-29, ????
					LOGGER.debug("Local authentication by sso is failed (Invalidated session) : {}", ex.getMessage());
				} catch (Exception ex) {
					// DB? ?? ??????????????? ???????
					LOGGER.debug("Local authentication by sso is failed : {}", ex.getMessage());
				}

			}
		}

	}

	@Override
	public void init(FilterConfig filterConfig) throws ServletException {

		this.config = filterConfig;
	}
}
