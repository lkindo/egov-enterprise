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
 * Egov SSO 濡쒓렇???꾪꽣
 * 
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?쒖???
 * @since 2011.08.02
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2011.08.02  ?쒖???         理쒖큹 ?앹꽦
 *   2025.07.29  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-UncommentedEmptyMethodBody(鍮?硫붿냼?쒖뿉 鍮덈찓?뚮뱶?꾩쓣 ?섑??대뒗 二쇱꽍??異붽???寃?
 *   2025.07.29  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-UselessParentheses(遺덊븘?뷀븳 愿꾪샇?ъ슜)
 *
 *      </pre>
 */
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
			// 221116 源?쒖? 2022 ?쒗걧?댁퐫??議곗튂
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
						// sso?쒕쾭???좏겙 ?앹꽦
						egovSSOService.requestIssueToken(request, response);
						// sso ?몄쬆 ?꾨즺 ?щ?瑜??몄뀡?????
						session.setAttribute("isRemotelyAuthenticated", "true");
					} else {
						LOGGER.debug("EgovSSOService is null, skipping SSO token issuance.");
						session.setAttribute("isRemotelyAuthenticated", "fail");
					}

					// 濡쒖뺄 ?몄쬆 ?곸슜 ?щ? ?꾨즺瑜??몄뀡?????
					session.setAttribute("isLocallyAuthenticated", "true");

				} catch (IllegalStateException ex) {// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
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
					// sso?쒕쾭???좏겙??議댁옱?섎뒗吏 泥댄겕??
					isSSOLoggedOn = egovSSOService.hasTokenInSSOServer(httpRequest, response);
					if (isSSOLoggedOn) {
						// ?쒕쾭???좏겙??議댁옱??寃쎌슦 濡쒖뺄 ?몄쬆???꾪빐 isRemotelyAuthenticated true濡?蹂寃?
						session.setAttribute("isRemotelyAuthenticated", "true");

						// 濡쒖뺄 DB?몄쬆???꾪븳 loginVO 媛앹껜瑜??몄뀡?????
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
					// ?몄뀡 ?좏겙 ?뺣낫瑜?媛吏怨?DB濡쒕????ъ슜???뺣낫瑜?媛?몄샂
					LoginVO loginVO = (LoginVO) session.getAttribute("loginVOForDBAuthentication");
					loginVO = loginService.actionLoginByEsntlId(loginVO);
					if (loginVO != null && loginVO.getId() != null && !loginVO.getId().equals("")) {
						// ?몄뀡 濡쒓렇??
						session.setAttribute("loginVO", loginVO);

						// 濡쒖뺄 ?몄쬆寃곌낵 ?몄뀡?????
						session.setAttribute("isLocallyAuthenticated", "true");
					} else {
						LOGGER.debug("Local authentication by sso is failed");
					}
				} catch (IllegalStateException ex) {// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
					LOGGER.debug("Local authentication by sso is failed (Invalidated session) : {}", ex.getMessage());
				} catch (Exception ex) {
					// DB?몄쬆 ?덉쇅媛 諛쒖깮??寃쎌슦 濡쒓렇瑜??④린怨?濡쒖뺄?몄쬆???쒗궎吏 ?딄퀬 洹몃?濡?吏꾪뻾??
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
