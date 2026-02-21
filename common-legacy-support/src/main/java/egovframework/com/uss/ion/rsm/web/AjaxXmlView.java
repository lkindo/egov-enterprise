package egovframework.com.uss.ion.rsm.web;

import java.io.PrintWriter;
import java.util.Map;

import org.springframework.web.servlet.view.AbstractView;

import egovframework.com.cmm.EgovWebUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
*
* <pre>
* << ?????Modification Information) >>
*
*   ????     ????          ????
*  ------- 	   --------    ---------------------------
*   2011.10.10  ????	?? ???? ??????)
* </pre>
**/

public class AjaxXmlView extends AbstractView {

	@SuppressWarnings("rawtypes")
	@Override
	protected void renderMergedOutputModel(Map model, HttpServletRequest request, HttpServletResponse response)
		throws Exception {
		PrintWriter writer = null;
		try {
			response.setContentType("text/xml");
			response.setHeader("Cache-Control", "no-cache");
			response.setCharacterEncoding("UTF-8");

			writer = response.getWriter();
			//			writer.write((String) model.get("ajaxXml"));
			writer.write(EgovWebUtil.clearXSSMaximum((String)model.get("ajaxXml")));//Request????? Parameter?XSS ???

		} finally {
			// 2011.10.10 ?? ???? ??????)
			if (writer != null) {
				writer.close();
			}
		}
	}
}
