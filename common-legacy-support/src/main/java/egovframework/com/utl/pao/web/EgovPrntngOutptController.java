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
 * ???????? Controller ?????
 * @author ???????? ????
 * @since 2009.02.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.02.01  ????         ????
 *
 * </pre>
 **/
@Controller
public class EgovPrntngOutptController {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovPrntngOutptController.class);

	/**
	 * ???????? ???
	 * @param request
	 * @param response
	 * @return
	 * @throws ServletException
	 * @throws IOException
	 **/
	@RequestMapping(value = "/utl/pao/EgovPrntngOutpt.do")
	public ModelAndView handleRequest(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		LOGGER.info("EgovPrntngOutptController start....");
		Map<String, Object> cmdModel = new HashMap<>();

		// ????JSP
		String jspStr = "";
		// ??
		//String resultStr = "";
		// ????
		String cmdStr = request.getParameter("cmdStr");
		if (cmdStr == null || cmdStr.equals("")) {
			cmdStr = "";
		}

		// ???? ? JSP ?
		if (cmdStr.equals("ComUtlPaoErncslOutpt")) { // test ?????
			jspStr = "egovframework/com/utl/pao/EgovErncslOutpt";

			cmdModel.put("resultStr", "UTILITY          ???         ");
		} else {
			jspStr = "/egovDevIndex";
		}
		LOGGER.info("EgovPrntngOutptController end....");

		return new ModelAndView(jspStr, "cmdModel", cmdModel);
	}
}
