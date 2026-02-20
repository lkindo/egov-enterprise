package egovframework.com.cmm.web;

import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.util.Base64;
import java.util.Map;

import org.apache.commons.lang.StringUtils;
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
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? ?댁궪??
 * @since 2009. 4. 2.
 * @version
 * @see
 * 
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.04.02  ?댁궪??         理쒖큹?앹꽦
 *   2014.03.31  ?좎?蹂댁닔         fileSn ?ㅻ쪟?섏젙
 *   2018.08.31  ?댁젙?          MimeType 以묐났?ㅼ젙 ?쒓굅
 *   2019.11.29  ?좎슜??         KISA 蹂댁븞?쎌젏 議곗튂 : HTTP?묐떟遺꾪븷(HTTP_Response_Splitting,CRLF)痍⑥빟??議곗튂
 *   2025.06.03  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(吏??蹂??紐낅챸 洹쒖튃), CloseResource(由ъ냼???リ린), AssignmentInOperand(?쇱뿰?곗옄???좊떦)
 *
 *      </pre>
 */
@SuppressWarnings("serial")
@Controller
public class EgovImageProcessController extends HttpServlet {

	/** ?뷀샇?붿꽌鍮꾩뒪 */
	@Resource(name = "egovEnvCryptoService")
	EgovEnvCryptoService cryptoService;

	@Resource(name = "EgovFileMngService")
	private EgovFileMngService fileService;

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovImageProcessController.class);

	/**
	 * 泥⑤????대?吏?????誘몃━蹂닿린 湲곕뒫???쒓났?쒕떎.
	 *
	 * @param atchFileId
	 * @param fileSn
	 * @param sessionVO
	 * @param model
	 * @param response
	 * @throws Exception
	 */
	@RequestMapping("/cmm/fms/getImage.do")
	public void getImageInf(SessionVO sessionVO, ModelMap model, @RequestParam Map<String, Object> commandMap,
			HttpServletRequest request, HttpServletResponse response) throws Exception {

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

		FileVO vo = new FileVO();

		vo.setAtchFileId(decodedFileId);
		vo.setFileSn(fileSn);

		// ------------------------------------------------------------
		// fileSn???녿뒗 寃쎌슦 留덉?留??뚯씪 李몄“
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
