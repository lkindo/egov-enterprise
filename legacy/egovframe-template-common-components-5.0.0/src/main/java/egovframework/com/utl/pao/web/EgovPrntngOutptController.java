package egovframework.com.utl.pao.web;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.servlet.ModelAndView;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 *
 * ?꾩옄愿??異쒕젰 ?붾㈃ Controller ?대옒??
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?댁쨷??
 * @since 2009.02.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.02.01  ?댁쨷??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@Controller
public class EgovPrntngOutptController {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovPrntngOutptController.class);

	/**
	 * ?꾩옄愿??異쒕젰 ?붾㈃ 而⑦듃濡?
	 * @param request
	 * @param response
	 * @return
	 * @throws ServletException
	 * @throws IOException
	 */
	@RequestMapping(value = "/utl/pao/EgovPrntngOutpt.do")
	public ModelAndView handleRequest(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		LOGGER.info("EgovPrntngOutptController start....");
		Map<String, Object> cmdModel = new HashMap<>();

		// ?대룞??JSP
		String jspStr = "";
		// 寃곌낵?뺣낫
		//String resultStr = "";
		// ?ㅽ뻾紐낅졊??
		String cmdStr = request.getParameter("cmdStr");
		if (cmdStr == null || cmdStr.equals("")) {
			cmdStr = "";
		}

		// ?ㅽ뻾紐낅졊?댁뿉 ?곕Ⅸ JSP ?좊떦
		if (cmdStr.equals("ComUtlPaoErncslOutpt")) { // test ?섑뵆??寃쎈줈
			jspStr = "egovframework/com/utl/pao/EgovErncslOutpt";

			cmdModel.put("resultStr", "UTILITY 吏곸젒 ?몄텧");
		} else {
			jspStr = "/egovDevIndex";
		}
		LOGGER.info("EgovPrntngOutptController end....");

		return new ModelAndView(jspStr, "cmdModel", cmdModel);
	}
}