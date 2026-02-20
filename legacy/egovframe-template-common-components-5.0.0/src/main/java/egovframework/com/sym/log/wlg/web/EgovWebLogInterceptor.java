package egovframework.com.sym.log.wlg.web;

import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.ModelAndView;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.sym.log.wlg.service.EgovWebLogService;
import egovframework.com.sym.log.wlg.service.WebLog;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * @Class Name : EgovWebLogInterceptor.java
 * @Description : ?밸줈洹??앹꽦???꾪븳 ?명꽣?됲꽣 ?대옒??
 * @Modification Information
 * 
 *               <pre>
 *    ?섏젙??       ?섏젙??        ?섏젙?댁슜
 *    -------      -------     -------------------

 *               </pre>
 * 
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? ?댁궪??
 * @since 2009. 3. 9.
 * @version
 * @see
 *
 */
/**
 * ?ъ슜??怨꾩젙??泥섎━?섎뒗 鍮꾩쫰?덉뒪 援ы쁽 ?대옒??
 * <p>
 * <b>NOTE:</b> Exception 醫낅쪟瑜?EgovBizException, RuntimeException ?먯꽌留??숈옉?쒕떎.
 * fail.common.msg 硫붿꽭吏?ㅺ? Message Resource ???뺤쓽 ?섏뼱 ?덉뼱???쒕떎.
 * 
 * @author 怨듯넻而댄룷?뚰듃 媛쒕컻? ?띻만??
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.09  ?댁궪??         理쒖큹 ?앹꽦
 *   2011.07.01  ?닿린??         ?⑦궎吏 遺꾨━(sym.log -> sym.log.wlg)
 *   2025.07.15  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-UnnecessaryBoxing(遺덊븘?뷀븳 WrapperObject ?앹꽦)
 *
 *      </pre>
 */
public class EgovWebLogInterceptor implements HandlerInterceptor {

	@Resource(name = "EgovWebLogService")
	private EgovWebLogService webLogService;

	/**
	 * ??濡쒓렇?뺣낫瑜??앹꽦?쒕떎.
	 * 
	 * @param HttpServletRequest request, HttpServletResponse response, Object
	 *                           handler
	 * @return
	 * @throws Exception
	 */
	@Override
	public void postHandle(HttpServletRequest request, HttpServletResponse response, Object handler,
			ModelAndView modeAndView) throws Exception {

		WebLog webLog = new WebLog();
		String reqURL = request.getRequestURI();

		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		if (loginVO != null) {
			webLog.setRqesterId(loginVO.getUniqId());
		}

		webLog.setUrl(reqURL);

		webLog.setRqesterIp(request.getRemoteAddr());

		webLogService.logInsertWebLog(webLog);

	}
}
