package egovframework.com.uat.uap.filter;

import java.io.IOException;
import java.net.URLEncoder;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.FilterConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationContext;
import org.springframework.web.context.support.WebApplicationContextUtils;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.uat.uap.service.EgovLoginPolicyService;
import egovframework.com.uat.uap.service.LoginPolicyVO;
import egovframework.com.utl.sim.service.EgovClntInfo;

/**

 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????         ????
 *  -------    --------    ---------------------------

 *
 *      </pre>
 **/
/**
 * ???? ??
 * 
 * @author ???????? ?????
 * @since 2011.07.01
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2011.07.01  ?????         ????
 *   2017-02-14  ????          ??????ES) - ???????????? ??CWE-253, CWE-440, CWE-754]
 *   2025.07.30  ????         2025????????PMD???????? ????????-UncommentedEmptyMethodBody(????? ?????? ??????????????
 *
 *      </pre>
 **/
public class EgovLoginPolicyFilter implements Filter {

	private FilterConfig config;

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovLoginPolicyFilter.class);

	/**
	 * IP???????? ???? ??
	 * 
	 * @param request
	 * @param response
	 * @param chain
	 * @return void
	 * @exception IOException, ServletException
	 **/
	@Override
	public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
			throws IOException, ServletException {

		ApplicationContext act = WebApplicationContextUtils
				.getRequiredWebApplicationContext(config.getServletContext());
		EgovLoginPolicyService egovLoginPolicyService = (EgovLoginPolicyService) act.getBean("egovLoginPolicyService");
		EgovMessageSource egovMessageSource = (EgovMessageSource) act.getBean("egovMessageSource");

		HttpServletRequest httpRequest = (HttpServletRequest) request;

		String id = request.getParameter("id");
		// String password = request.getParameter("password");
		String userSe = request.getParameter("userSe");
		String userIp = "";

		LOGGER.debug(">>> EgovLoginPolicyFilter > doFilter > id: {}, userSe: {}", id, userSe);

		if (id == null || userSe == null) {
			LOGGER.debug(
					">>> EgovLoginPolicyFilter > Missing parameters > id or userSe is null. Redirecting to login.");
			// ((HttpServletResponse) response).sendRedirect(httpRequest.getContextPath() +
			// "/uat/uia/egovLoginUsr.do");
			// Don't redirect here, let the chain continue or return error?
			// If this filter is ONLY for actionLogin.do, then parameters are mandatory.
			// But if it intercepts forwards... actionLogin.do forwarding to mainPage.do
			// might trigger this if filter matches?
			// But filter only matches /uat/uia/actionLogin.do.
			// Proceeding with redirect but logging it.
			((HttpServletResponse) response).sendRedirect(
					httpRequest.getContextPath() + "/uat/uia/egovLoginUsr.do?login_error=parameter_missing");
			return;
		}

		// 1. LoginVO??DB??????????

		try {
			// ?IP
			userIp = EgovClntInfo.getClntIP((HttpServletRequest) request);

			boolean loginPolicyYn = true;

			LoginPolicyVO loginPolicyVO = new LoginPolicyVO();
			loginPolicyVO.setEmplyrId(id);
			loginPolicyVO = egovLoginPolicyService.selectLoginPolicy(loginPolicyVO);

			if (loginPolicyVO == null) {
				loginPolicyYn = true;
			} else {
				if (loginPolicyVO.getLmttAt().equals("Y")) {
					if (!userIp.equals(loginPolicyVO.getIpInfo())) {
						loginPolicyYn = false;
					}
				}
			}

			if (loginPolicyYn) {
				chain.doFilter(request, response);

			} else {
				String message = URLEncoder.encode(egovMessageSource.getMessage("fail.common.login.ip"), "UTF-8");
				((HttpServletRequest) request).setAttribute("loginMessage", message);
				((HttpServletResponse) response).sendRedirect(
						httpRequest.getContextPath() + "/uat/uia/egovLoginUsr.do?loginMessage=" + message);
			}

		} catch (IOException e) {// KISA ?? ??(2018-10-29, ????
			LOGGER.error("[" + e.getClass() + "] : ", e.getMessage());
			((HttpServletResponse) response)
					.sendRedirect(httpRequest.getContextPath() + "/uat/uia/egovLoginUsr.do?login_error=1");
		} catch (Exception e) {
			// LOGGER.error("Exception: {}", e.getClass().getName());
			// LOGGER.error("Exception Message: {}", e.getMessage());
			// 2017-02-14 ???? ??????ES) - ???????????? ??CWE-253, CWE-440, CWE-754]
			LOGGER.error("[" + e.getClass() + "] : ", e.getMessage());

			((HttpServletResponse) response)
					.sendRedirect(httpRequest.getContextPath() + "/uat/uia/egovLoginUsr.do?login_error=1");
		}
	}

	@Override
	public void init(FilterConfig config) throws ServletException {

		this.config = config;

	}

}
