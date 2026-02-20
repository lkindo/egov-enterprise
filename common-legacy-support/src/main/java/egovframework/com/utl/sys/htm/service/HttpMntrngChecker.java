package egovframework.com.utl.sys.htm.service;

import java.io.File;
import java.io.IOException;
import java.net.URL;

import egovframework.com.cmm.EgovWebUtil;

/**
 * @Class Name : HttpMntrngChecker.java
 * @Description : HTTP????????? Check ?????
 * @Modification Information
 *
 *               ????????????
 *               ---------- ------- -------------------
 *               2010.09.06 ?????
 *               2019.12.05 ???KISA ?? ??(???? ??,????????
 *
 * @author ??
 * @since 2010.05.01
 * @version
 * @see
 *
 **/

public class HttpMntrngChecker {

	// @Resource(name = "HttpMonService")
	// private EgovHttpMonService httpMonService;

	// ??????
	static final char FILE_SEPARATOR = File.separatorChar;

	// ? ??
	static final int MAX_STR_LEN = 1024;

	// ??????
	static private String[] whiteListURL = { "wwww.egovwebserver.go.kr", "wwww.egovwasserver.go.kr",
			"192.168.100.133" };

	/**
	 * ???? ??? ??????? ?????? ??
	 * 
	 * @param String sitUrl ???????
	 * @return String status ???
	 * @exception Exception
	 **/
	public static String getPrductStatus(String siteUrl) throws IOException {

		boolean isAuth = false;

		for (String urlPattern : whiteListURL) {
			if (siteUrl.contains(urlPattern)) {
				isAuth = true;
				break;
			}
		}
		if (!isAuth) {
			throw new IOException("UnRegistered site URL : " + siteUrl);
		}

		String httpSttusCd = null;

		try {
			siteUrl = EgovWebUtil.filePathBlackList(siteUrl);
			URL url = java.net.URI.create(siteUrl).toURL();
			url.openStream();

			httpSttusCd = "01";

		} catch (IOException e) {
			httpSttusCd = "02";
		}

		return httpSttusCd;
	}

}
