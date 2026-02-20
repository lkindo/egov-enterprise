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

import org.apache.commons.lang3.StringUtils;
import org.egovframe.rte.fdl.crypto.EgovEnvCryptoService;
import org.springframework.stereotype.Controller;
import org.springframework.util.FileCopyUtils;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.company.project.service.file.EgovFileService;
import com.company.project.service.file.dto.FileDto;

import egovframework.com.cmm.EgovBrowserUtil;
import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.cmm.util.EgovBasicLogger;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * ??? ???? ??? ?????
 * 
 * @author ??????? ????
 * @since 2009.06.01
 * @version 1.0
 * @see
 * 
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.03.25  ????         ????
 *   2014.02.24  ????         IE11 ???? ??? ??? ?????? ??
 *   2018.08.28  ???         Safari, Chrome, Firefox, Opera ?????? ??????? (macOS?? ???exe????????
 *   2022.12.02  ????         File ID ??????
 *   2025.05.31  ????         PMD???????? ????????-LocalVariableNamingConventions(???????, CloseResource(?????)
 *
 *   Copyright (C) 2009 by MOPAS  All rights reserved.
 *      </pre>
 **/
@Controller
public class EgovFileDownloadController {

	/** ???????**/
	@Resource(name = "egovEnvCryptoService")
	EgovEnvCryptoService cryptoService;

	@Resource(name = "egovFileService")
	private EgovFileService fileService;

	/**
	 * ????????????????? ???????.
	 *
	 * @param commandMap
	 * @param response
	 * @throws Exception
	 **/
	@RequestMapping(value = "/cmm/fms/FileDown.do")
	public void cvplFileDownload(@RequestParam Map<String, Object> commandMap, HttpServletRequest request,
			HttpServletResponse response) throws Exception {

		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (isAuthenticated) {

			// ??? atchFileId ????????????????????????. (2022.12.06 ??) - ?????? ?
			// ???? ??
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

			// New Service Usage
			Integer sn = Integer.parseInt(fileSn);
			FileDto fvo = fileService.getFileDetail(decodedFileId, sn);

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
				// response.setBufferSize(fSize); // OutOfMemeory ?
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
					// ?? Exception ?????
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
