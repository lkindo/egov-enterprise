package egovframework.com.cmm.web;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

import org.apache.commons.lang.StringUtils;
import org.egovframe.rte.fdl.crypto.EgovEnvCryptoService;
import org.springframework.stereotype.Controller;
import org.springframework.util.FileCopyUtils;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.EgovBrowserUtil;
import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.cmm.service.EgovFileMngService;
import egovframework.com.cmm.service.FileVO;
import egovframework.com.cmm.util.EgovBasicLogger;
import egovframework.com.cmm.util.EgovResourceCloseHelper;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * ?뚯씪 ?ㅼ슫濡쒕뱶瑜??꾪븳 而⑦듃濡ㅻ윭 ?대옒??
 * 
 * @author 怨듯넻?쒕퉬?ㅺ컻諛쒗? ?댁궪??
 * @since 2009.06.01
 * @version 1.0
 * @see
 * 
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.25  ?댁궪??         理쒖큹 ?앹꽦
 *   2014.02.24  ?닿린??         IE11 釉뚮씪?곗? ?쒓? ?뚯씪 ?ㅼ슫濡쒕뱶???먮윭 ?섏젙
 *   2018.08.28  ?좎슜??         Safari, Chrome, Firefox, Opera ?쒓??뚯씪 ?ㅼ슫濡쒕뱶 泥섎━ ?섏젙 (macOS?먯꽌 ?뺤옣??exe遺숇뒗 臾몄젣 泥섎━)
 *   2022.12.02  ?ㅼ갹??         File ID ?뷀샇??泥섎━
 *   2025.05.31  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(吏??蹂??紐낅챸 洹쒖튃), CloseResource(由ъ냼???リ린)
 *
 *   Copyright (C) 2009 by MOPAS  All rights reserved.
 *      </pre>
 */
@Controller
public class EgovFileDownloadController {

	/** ?뷀샇?붿꽌鍮꾩뒪 */
	@Resource(name = "egovEnvCryptoService")
	EgovEnvCryptoService cryptoService;

	@Resource(name = "EgovFileMngService")
	private EgovFileMngService fileService;

	/**
	 * 泥⑤??뚯씪濡??깅줉???뚯씪????섏뿬 ?ㅼ슫濡쒕뱶瑜??쒓났?쒕떎.
	 *
	 * @param commandMap
	 * @param response
	 * @throws Exception
	 */
	@RequestMapping(value = "/cmm/fms/FileDown.do")
	public void cvplFileDownload(@RequestParam Map<String, Object> commandMap, HttpServletRequest request,
			HttpServletResponse response) throws Exception {

		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (isAuthenticated) {

			// ?뷀샇?붾맂 atchFileId 瑜?蹂듯샇?뷀븯怨??숈씪???몄뀡??寃쎌슦留??ㅼ슫濡쒕뱶?????덈떎. (2022.12.06 異붽?) - ?뚯씪?꾩씠?붽? ?좎텛
			// 遺덇??ν븯?꾨줉 議곗튂
			String param_atchFileId = (String) commandMap.get("atchFileId");
			param_atchFileId = param_atchFileId.replaceAll(" ", "+");
			byte[] decodedBytes = Base64.getDecoder().decode(param_atchFileId);
			String decodedString = cryptoService.decrypt(new String(decodedBytes));
			String decodedSessionId = StringUtils.substringBefore(decodedString, "|");
			String decodedFileId = StringUtils.substringAfter(decodedString, "|");
			String fileSn = (String) commandMap.get("fileSn");

			String sessionId = request.getSession().getId();

			boolean isSameSessionId = StringUtils.equals(decodedSessionId, sessionId);

			if (!isSameSessionId) {
				throw new Exception();
			}

			FileVO fileVO = new FileVO();
			fileVO.setAtchFileId(decodedFileId);
			fileVO.setFileSn(fileSn);
			FileVO fvo = fileService.selectFileInf(fileVO);

			File uFile = new File(fvo.getFileStreCours(), fvo.getStreFileNm());
			long fSize = uFile.length();

			if (fSize > 0) {
				String mimetype = "application/x-msdownload";

				String userAgent = request.getHeader("User-Agent");
				HashMap<String, String> result = EgovBrowserUtil.getBrowser(userAgent);
				if (!EgovBrowserUtil.MSIE.equals(result.get(EgovBrowserUtil.TYPEKEY))) {
					mimetype = "application/x-stuff";
				}

				String contentDisposition = EgovBrowserUtil.getDisposition(fvo.getOrignlFileNm(), userAgent, "UTF-8");
				// response.setBufferSize(fSize); // OutOfMemeory 諛쒖깮
				response.setContentType(mimetype);
				// response.setHeader("Content-Disposition", "attachment; filename=\"" +
				// contentDisposition + "\"");
				response.setHeader("Content-Disposition", contentDisposition);
				response.setContentLengthLong(fSize);

				/*
				 * FileCopyUtils.copy(in, response.getOutputStream()); in.close();
				 * response.getOutputStream().flush(); response.getOutputStream().close();
				 */

				try (BufferedInputStream in = new BufferedInputStream(new FileInputStream(uFile));
						BufferedOutputStream out = new BufferedOutputStream(response.getOutputStream());) {
					FileCopyUtils.copy(in, out);
					out.flush();
				} catch (IOException ex) {
					// ?ㅼ쓬 Exception 臾댁떆 泥섎━
					// Connection reset by peer: socket write error
					EgovBasicLogger.ignore("IO Exception", ex);
				}

			} else {
				response.setContentType("application/x-msdownload");

				PrintWriter printwriter = response.getWriter(); // NOPMD - CloseResource

				printwriter.println("<html>");
				printwriter.println("<br><br><br><h2>Could not get file name:<br>"
						+ EgovWebUtil.clearXSSMaximum(fvo.getOrignlFileNm()) + "</h2>");// 2022.01 Potential XSS in
																						// Servlet
				printwriter
						.println("<br><br><br><center><h3><a href='javascript: history.go(-1)'>Back</a></h3></center>");
				printwriter.println("<br><br><br>&copy; webAccess");
				printwriter.println("</html>");

				printwriter.flush();
				printwriter.close();
			}
		}
	}
}
