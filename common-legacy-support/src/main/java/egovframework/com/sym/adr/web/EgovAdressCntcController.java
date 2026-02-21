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
 * ??????? Controller
 *
 * ????????????
 * ---------- --------- -------------------
 * 2014.10.21 ??????????
 * 2015.04.01 ??Test??Open API confmKey encode??
 * 2020.10.29 ???KISA ?? ??(?????? ??, ?????? ??????
 * 2022.05.10 ???XSS??? ? ????
 *
 * @author ???????
 * @since 2014.10.21
 * @version 3.5
 **/

@Controller
public class EgovAdressCntcController {

	/**
	 * ??????????????? Open API????? ?????????.
	 *
	 * @param req
	 * @param model
	 * @param response
	 * @throws Exception
	 **/
	@RequestMapping(value = "/sym/adr/getAdressCntcApi.do")
	public void getAddrApi(HttpServletRequest req, ModelMap model, HttpServletResponse response) throws Exception {

		String currentPage = req.getParameter("currentPage");
		String countPerPage = req.getParameter("countPerPage");
		String confmKey = req.getParameter("confmKey");
		String keyword = req.getParameter("keyword");
		String apiUrl = "http://www.juso.go.kr/addrlink/addrLinkApi.do?currentPage=" + currentPage + "&countPerPage="
				+ countPerPage + "&keyword=" + URLEncoder.encode(keyword, "UTF-8") + "&confmKey=" + confmKey;
		URL url = java.net.URI.create(EgovWebUtil.filePathBlackList(apiUrl)).toURL();
		try (BufferedReader br = new BufferedReader(new InputStreamReader(url.openStream(), "UTF-8"));) {// 2022.01
																											// Resources
																											// should be
																											// closed
			StringBuilder sb = new StringBuilder();
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
	 * ??????????????? Test??Open API????? ?????????.
	 * 
	 * @param req
	 * @param model
	 * @param response
	 * @throws Exception
	 **/
	@RequestMapping(value = "/sym/adr/getAdressCntcTestApi.do")
	public void getAddrApiTest(HttpServletRequest req, ModelMap model, HttpServletResponse response) throws Exception {

		String currentPage = req.getParameter("currentPage");
		String countPerPage = req.getParameter("countPerPage");
		String confmKey = req.getParameter("confmKey");
		String keyword = req.getParameter("keyword");
		String apiUrl = "http://www.juso.go.kr/addrlink/addrLinkApiTest.do?currentPage=" + currentPage
				+ "&countPerPage=" + countPerPage + "&keyword=" + URLEncoder.encode(keyword, "UTF-8") + "&confmKey="
				+ URLEncoder.encode(confmKey, "UTF-8");
		URL url = java.net.URI.create(EgovWebUtil.filePathBlackList(apiUrl)).toURL();
		try (BufferedReader br = new BufferedReader(new InputStreamReader(url.openStream(), "UTF-8"));) {// 2022.01
																											// Resources
																											// should be
																											// closed
			StringBuilder sb = new StringBuilder();
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
	 * ????? ?? ???????.
	 *
	 * @return
	 **/
	@IncludedInfo(name = "Name", listUrl = "", order = 1, gid = 50)
	@RequestMapping(value = "/sym/adr/getAdressCntcInitPage.do")
	public String selectMainMenuHome() {

		return "egovframework/com/sym/adr/EgovAdressCntc";
	}

}
