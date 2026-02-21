package egovframework.com.cmm.web;

import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.util.Base64;
import java.util.Map;

import org.apache.commons.lang3.StringUtils;
import org.egovframe.rte.fdl.crypto.EgovEnvCryptoService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.util.FileCopyUtils;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.cmm.SessionVO;
import egovframework.com.cmm.service.EgovFileMngService;
import egovframework.com.cmm.service.FileVO;
import egovframework.com.cmm.util.EgovResourceCloseHelper;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * EgovImageProcessController.java
 * 
 * @author ????????? ????
 * @since 2009. 4. 2.
 * @version
 * @see
 * 
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.04.02  ????         ???
 *   2014.03.31  ????        fileSn ????
 *   2018.08.31  ????          MimeType ??? ??
 *   2019.11.29  ???         KISA ?? ??: HTTP???HTTP_Response_Splitting,CRLF)?????
 *   2025.06.03  ????         PMD???????? ????????-LocalVariableNamingConventions(???????, CloseResource(?????), AssignmentInOperand(??????)
 *
 *      </pre>
 **/
@Controller
public class EgovImageProcessController extends HttpServlet {

	private static final long serialVersionUID = 1L;

	/** ???????**/
	@Resource(name = "egovEnvCryptoService")
	EgovEnvCryptoService cryptoService;

	@Resource(name = "EgovFileMngService")
	private EgovFileMngService fileService;

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovImageProcessController.class);

	/**
	 * ?????????????? ???????.
	 *
	 * @param atchFileId
	 * @param fileSn
	 * @param sessionVO
	 * @param model
	 * @param response
	 * @throws Exception
	 **/
	@RequestMapping("/cmm/fms/getImage.do")
	public void getImageInf(SessionVO sessionVO, ModelMap model, @RequestParam Map<String, Object> commandMap,
			HttpServletRequest request, HttpServletResponse response) throws Exception {

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

		FileVO vo = new FileVO();

		vo.setAtchFileId(decodedFileId);
		vo.setFileSn(fileSn);

		// ------------------------------------------------------------
		// fileSn???? ??????? ??
		// ------------------------------------------------------------
		if (fileSn == null || fileSn.equals("")) {
			int newMaxFileSN = fileService.getMaxFileSN(vo);
			vo.setFileSn(Integer.toString(newMaxFileSN - 1));
		}
		// ------------------------------------------------------------

		FileVO fvo = fileService.selectFileInf(vo);

		// String fileLoaction = fvo.getFileStreCours() + fvo.getStreFileNm();

		String fileStreCours = EgovWebUtil.filePathBlackList(fvo.getFileStreCours());
		String streFileNm = EgovWebUtil.filePathBlackList(fvo.getStreFileNm());
		File file = new File(fileStreCours, streFileNm);

		ByteArrayOutputStream bStream = null;

		try (FileInputStream fis = new FileInputStream(file); BufferedInputStream in = new BufferedInputStream(fis);) {
			bStream = new ByteArrayOutputStream();

			FileCopyUtils.copy(in, bStream);

			String type = "";

			if (fvo.getFileExtsn() != null && !"".equals(fvo.getFileExtsn())) {
				if ("jpg".equals(fvo.getFileExtsn().toLowerCase())) {
					type = "image/jpeg";
				} else {
					type = "image/" + fvo.getFileExtsn().toLowerCase();
				}
				/* type = "image/" + fvo.getFileExtsn().toLowerCase(); */

			} else {
				LOGGER.debug("Image fileType is null.");
			}

			response.setHeader("Content-Type", EgovWebUtil.removeCRLF(type));
			response.setContentLength(bStream.size());

			bStream.writeTo(response.getOutputStream());

			response.getOutputStream().flush();
			response.getOutputStream().close();

		} finally {
			EgovResourceCloseHelper.close(bStream);
		}
	}
}
