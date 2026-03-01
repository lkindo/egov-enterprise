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
* << 媛쒖젙?대젰(Modification Information) >>
*
*   ?섏젙??     ?섏젙??          ?섏젙?댁슜
*  ------- 	   --------    ---------------------------
*   2011.10.10  ?닿린??	蹂댁븞?먭? 議곗튂(?먰룷?명듃 ??갭議?諛⑹?)
* </pre>
*/

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
			writer.write(EgovWebUtil.clearXSSMaximum((String)model.get("ajaxXml")));//Request濡??ㅼ뼱?ㅻ뒗 Parameter留?XSS 泥섎━ ?꾩슂

		} finally {
			// 2011.10.10 蹂댁븞?먭? 議곗튂(?먰룷?명듃 ??갭議?諛⑹?)
			if (writer != null) {
				writer.close();
			}
		}
	}
}
