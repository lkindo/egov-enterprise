package egovframework.com.utl.sys.htm.service;

import java.io.File;
import java.io.IOException;
import java.net.URL;

import egovframework.com.cmm.EgovWebUtil;

/**
 * @Class Name : HttpMntrngChecker.java
 * @Description : HTTP?쒕퉬?ㅻえ?덊꽣留곸쓣 ?꾪븳 Check ?대옒??
 * @Modification Information
 *
 *    ?섏젙??               ?섏젙??        ?섏젙?댁슜
 *    ----------   -------   -------------------
 *    2010.09.06   諛뺤쥌??         理쒖큹?앹꽦
 *    2019.12.05   ?좎슜??         KISA 蹂댁븞?쎌젏 議곗튂 (寃쎈줈議곗옉諛??먯썝 ?쎌엯,遺?곸젅???덉쇅泥섎━)
 *
 * @author  諛뺤쥌??
 * @since 2010.05.01
 * @version
 * @see
 *
 */

public class HttpMntrngChecker {

	//@Resource(name = "HttpMonService")
	//
                     EgovHttpMonService httpMonService;

	// ?뚯씪援щ텇??
	static final char FILE_SEPARATOR = File.separatorChar;

	// 理쒕? 臾몄옄湲몄씠
	static final int MAX_STR_LEN = 1024;

	// ?붿씠??由ъ뒪??
	static private String[] whiteListURL = { "wwww.egovwebserver.go.kr"
												,"wwww.egovwasserver.go.kr"
												,"192.168.100.133" };

	/**
	 * ?쒖뒪?쒖뿉 議댁옱?섎뒗 ?쒕쾭???ㅽ뻾?곹깭 ?뺣낫瑜?議고쉶?섎뒗 湲곕뒫
	 * @param String sitUrl ?ъ슜?ы듃
	 * @return String status ?ㅽ뻾?곹깭
	 * @exception Exception
	*/
	public static String getPrductStatus(String siteUrl) throws IOException {

		boolean isAuth = false;

		for (String urlPattern : whiteListURL)
		{
			if (siteUrl.contains(urlPattern))
			{
				isAuth = true;
				break;
			}
		}
		if ( !isAuth ) {
			throw new IOException("UnRegistered site URL : "+siteUrl);
		}

		String httpSttusCd = null;

		try {
			siteUrl = EgovWebUtil.filePathBlackList(siteUrl);
			URL url = new URL(siteUrl);
			url.openStream();

			httpSttusCd = "01";

		} catch (IOException e) {
			httpSttusCd = "02";
		}

		return httpSttusCd;
	}

}
