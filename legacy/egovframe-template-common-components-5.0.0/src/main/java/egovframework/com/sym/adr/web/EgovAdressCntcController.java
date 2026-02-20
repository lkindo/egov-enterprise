package egovframework.com.sym.adr.web;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.URL;
import java.net.URLEncoder;

import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.RequestMapping;

import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.cmm.annotation.IncludedInfo;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * ?꾨줈紐?二쇱냼 ?곌퀎瑜??꾪븳 Controller
 *
 *  ?섏젙??               ?섏젙??            ?섏젙?댁슜
 *  ----------   ---------   -------------------
 *  2014.10.21   ?쒖??꾨젅?꾩썙??   理쒖큹?앹꽦
 *  2015.04.01   ?꾩뿬泥?           Test??Open API confmKey encode異붽?
 *  2020.10.29   ?좎슜??           KISA 蹂댁븞?쎌젏 議곗튂 (寃쎈줈 議곗옉 諛??먯썝 ?쎌엯, ?щ줈?ㅼ궗?댄듃 ?ㅽ겕由쏀듃)
 *  2022.05.10   ?뺤쭊??           XSS怨듦꺽諛⑹? ?꾪븳 硫붿냼??蹂寃?
 *
 * @author ?쒖??꾨젅?꾩썙??
 * @since 2014.10.21
 * @version 3.5
 */

@Controller
public class EgovAdressCntcController {

	/**
	 * ?꾨줈紐낆＜???덈궡?쒖뒪?쒖뿉???쒓났?섎뒗 Open API瑜??몄텧?섏뿬 二쇱냼 ?뺣낫瑜??살뼱?⑤떎.
	 *
	 * @param req
	 * @param model
	 * @param response
	 * @throws Exception
	 */
	@RequestMapping(value = "/sym/adr/getAdressCntcApi.do")
	public void getAddrApi(HttpServletRequest req, ModelMap model, HttpServletResponse response) throws Exception {

		String currentPage = req.getParameter("currentPage");
		String countPerPage = req.getParameter("countPerPage");
		String confmKey = req.getParameter("confmKey");
		String keyword = req.getParameter("keyword");
		String apiUrl = "http://www.juso.go.kr/addrlink/addrLinkApi.do?currentPage=" + currentPage + "&countPerPage="
			+ countPerPage + "&keyword=" + URLEncoder.encode(keyword, "UTF-8") + "&confmKey=" + confmKey;
		URL url = new URL(EgovWebUtil.filePathBlackList(apiUrl));
		try (BufferedReader br = new BufferedReader(new InputStreamReader(url.openStream(), "UTF-8"));) {//2022.01 Resources should be closed
			StringBuffer sb = new StringBuffer();
			String tempStr = null;
			while (true) {
				tempStr = br.readLine();
				if (tempStr == null) {
					break;
				}
				sb.append(tempStr);
			}

			response.setCharacterEncoding("UTF-8");
			response.setContentType("text/xml");
			response.getWriter().write(EgovWebUtil.clearXSSMaximum(sb.toString()));
		}
	}

	/**
	 * ?꾨줈紐낆＜???덈궡?쒖뒪?쒖뿉???쒓났?섎뒗 Test??Open API瑜??몄텧?섏뿬 二쇱냼 ?뺣낫瑜??살뼱?⑤떎.
	 * @param req
	 * @param model
	 * @param response
	 * @throws Exception
	 */
	@RequestMapping(value = "/sym/adr/getAdressCntcTestApi.do")
	public void getAddrApiTest(HttpServletRequest req, ModelMap model, HttpServletResponse response) throws Exception {

		String currentPage = req.getParameter("currentPage");
		String countPerPage = req.getParameter("countPerPage");
		String confmKey = req.getParameter("confmKey");
		String keyword = req.getParameter("keyword");
		String apiUrl = "http://www.juso.go.kr/addrlink/addrLinkApiTest.do?currentPage=" + currentPage
			+ "&countPerPage=" + countPerPage + "&keyword=" + URLEncoder.encode(keyword, "UTF-8") + "&confmKey="
			+ URLEncoder.encode(confmKey, "UTF-8");
		URL url = new URL(EgovWebUtil.filePathBlackList(apiUrl));
		try(BufferedReader br = new BufferedReader(new InputStreamReader(url.openStream(), "UTF-8"));){//2022.01 Resources should be closed
			StringBuffer sb = new StringBuffer();
			String tempStr = null;
			while (true) {
				tempStr = br.readLine();
				if (tempStr == null) {
					break;
				}
				sb.append(tempStr);
			}
			br.close();
			response.setCharacterEncoding("UTF-8");
			response.setContentType("text/xml");
			response.getWriter().write(EgovWebUtil.clearXSSMinimum(sb.toString()));
		}

	}

	/**
	 * 二쇱냼?뺣낫?곌퀎瑜??꾪븳 ?낅젰 ?섏씠吏瑜??몄텧?쒕떎.
	 *
	 * @return
	 */
	@IncludedInfo(name = "二쇱냼?뺣낫?곌퀎", listUrl = "/sym/adr/getAdressCntcInitPage.do", order = 2180, gid = 90)
	@RequestMapping(value = "/sym/adr/getAdressCntcInitPage.do")
	public String selectMainMenuHome() {

		return "egovframework/com/sym/adr/EgovAdressCntc";
	}

}
