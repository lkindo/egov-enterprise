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
 * @Description : ??????? ??? ?????
 * @Modification Information
 * 
 *               <pre>
 *    ????       ????        ????
 *    -------      -------     -------------------

 *               </pre>
 * 
 * @author ????????? ????
 * @since 2009. 3. 9.
 * @version
 * @see
 *
 **/
/**
 * ???????????? ???? ? ?????
 * <p>
 * <b>NOTE:</b> Exception ??EgovBizException, RuntimeException ???????.
 * fail.common.msg ????? Message Resource ??? ?? ??????.
 * 
 * @author ???? ?? ????
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.03.09  ????         ????
 *   2011.07.01  ????         ??? ???sym.log -> sym.log.wlg)
 *   2025.07.15  ????         2025????????PMD???????? ????????-UnnecessaryBoxing(???WrapperObject ??)
 *
 *      </pre>
 **/
public class EgovWebLogInterceptor implements HandlerInterceptor {

	@Resource(name = "EgovWebLogService")
	private EgovWebLogService webLogService;

	/**
	 * ??????????.
	 * 
	 * @param HttpServletRequest request, HttpServletResponse response, Object
	 *                           handler
	 * @return
	 * @throws Exception
	 **/
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
