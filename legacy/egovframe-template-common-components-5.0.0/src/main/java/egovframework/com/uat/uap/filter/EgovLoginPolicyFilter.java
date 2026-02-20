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
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??         ?섏젙?댁슜
 *  -------    --------    ---------------------------

 *
 *      </pre>
 */
/**
 * 濡쒓렇???뺤콉 泥댄겕 ?꾪꽣
 * 
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?쒖???
 * @since 2011.07.01
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2011.07.01  ?쒖???         理쒖큹 ?앹꽦
 *   2017-02-14  ?댁젙?          ?쒗걧?댁퐫??ES) - ?쒗걧?댁퐫??遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
 *   2025.07.30  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-UncommentedEmptyMethodBody(鍮?硫붿냼?쒖뿉 鍮덈찓?뚮뱶?꾩쓣 ?섑??대뒗 二쇱꽍??異붽???寃?
 *
 *      </pre>
 */
public class EgovLoginPolicyFilter implements Filter {

	private FilterConfig config;

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovLoginPolicyFilter.class);

	/**
	 * IP瑜??댁슜??濡쒓렇?몄쓣 ?쒗븳?섎뒗 硫붿꽌??
	 * 
	 * @param request
	 * @param response
	 * @param chain
	 * @return void
	 * @exception IOException, ServletException
	 */
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

		if (id == null || userSe == null) {
			((HttpServletResponse) response).sendRedirect(httpRequest.getContextPath() + "/uat/uia/egovLoginUsr.do");
		}

		// 1. LoginVO瑜?DB濡?遺??媛?몄삤??怨쇱젙

		try {
			// ?묒냽IP
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

		} catch (IOException e) {// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
			LOGGER.error("[" + e.getClass() + "] : ", e.getMessage());
			((HttpServletResponse) response)
					.sendRedirect(httpRequest.getContextPath() + "/uat/uia/egovLoginUsr.do?login_error=1");
		} catch (Exception e) {
//			LOGGER.error("Exception: {}", e.getClass().getName());
//			LOGGER.error("Exception  Message: {}", e.getMessage());
			// 2017-02-14 ?댁젙? ?쒗걧?댁퐫??ES) - ?쒗걧?댁퐫??遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
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
