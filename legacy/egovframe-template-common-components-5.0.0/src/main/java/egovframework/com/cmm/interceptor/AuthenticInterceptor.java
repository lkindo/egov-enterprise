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
 * ?몄쬆?щ? 泥댄겕 ?명꽣?됲꽣
 * 
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?쒖???
 * @since 2011.07.01
 * @version 1.0
 * @see
 *
 *      <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??         ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *  2011.07.01  ?쒖???         理쒖큹 ?앹꽦
 *  2011.09.07  ?쒖???         ?몄쬆???꾩슂?녿뒗 URL???⑥뒪?섎뒗 濡쒖쭅 異붽?
 *  2017.08.31  ?λ룞??         ?몄쬆???ъ슜??泥댄겕濡쒖쭅 蹂寃?諛?愿由ъ옄 沅뚰븳 泥댄겕 濡쒖쭅 異붽?
 *  2021.08.27  ?좎슜??         dummy紐⑤뱶 ?ъ슜??"60. 沅뚰븳愿由? ?묎렐?ㅻ쪟 ?섏젙
 *      </pre>
 */

public class AuthenticInterceptor implements HandlerInterceptor {

	@SuppressWarnings("unused")
	@Autowired
	private Environment environment;

	/** 愿由ъ옄 ?묎렐 沅뚰븳 ?⑦꽩 紐⑸줉 */
	private List<String> adminAuthPatternList;

	public List<String> getAdminAuthPatternList() {
		return adminAuthPatternList;
	}

	public void setAdminAuthPatternList(List<String> adminAuthPatternList) {
		this.adminAuthPatternList = Collections.unmodifiableList(adminAuthPatternList);
	}

	/**
	 * ?몄쬆???ъ슜???щ?濡??몄쬆 ?щ?瑜?泥댄겕?쒕떎.
	 * 愿由ъ옄 沅뚰븳???곕씪 ?묎렐 ?섏씠吏 沅뚰븳??泥댄겕?쒕떎.
	 */
	@Override
	public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
			throws Exception {
		// ?몄쬆?쒖궗?⑹옄 ?щ?
		boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		// 誘몃?利앹궗?⑹옄 泥댄겕
		if (!isAuthenticated) {
			ModelAndView modelAndView = new ModelAndView("redirect:/uat/uia/egovLoginUsr.do");
			throw new ModelAndViewDefiningException(modelAndView);
		}
		// ?몄쬆??沅뚰븳 紐⑸줉
		List<String> authList = EgovUserDetailsHelper.getAuthorities();
		// 愿由ъ옄?몄쬆?щ?
		boolean adminAuthUrlPatternMatcher = false;
		// AntPathRequestMatcher
		AntPathRequestMatcher antPathRequestMatcher = null;
		// 愿由ъ옄媛 ?꾨땺??泥댄겕??
		for (String adminAuthPattern : adminAuthPatternList) {
			antPathRequestMatcher = new AntPathRequestMatcher(adminAuthPattern);
			if (antPathRequestMatcher.matches(request)) {
				adminAuthUrlPatternMatcher = true;
			}
		}
		// 愿由ъ옄 沅뚰븳 泥댄겕
		if (adminAuthUrlPatternMatcher && !authList.contains("ROLE_ADMIN")) {
			ModelAndView modelAndView = new ModelAndView("redirect:/uat/uia/egovLoginUsr.do?auth_error=1");
			throw new ModelAndViewDefiningException(modelAndView);
		}
		return true;
	}

}
