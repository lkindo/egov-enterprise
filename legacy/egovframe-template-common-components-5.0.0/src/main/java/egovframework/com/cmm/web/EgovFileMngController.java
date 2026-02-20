package egovframework.com.cmm.web;

import java.util.Base64;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.crypto.EgovEnvCryptoService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.service.EgovFileMngService;
import egovframework.com.cmm.service.FileVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;

/**
 * ?뚯씪 議고쉶, ??젣, ?ㅼ슫濡쒕뱶 泥섎━瑜??꾪븳 而⑦듃濡ㅻ윭 ?대옒??
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
 *   2016.10.13  ?λ룞??         deleteFileInf 硫붿냼??return 諛⑹떇 ?섏젙
 *   2022.12.02  ?ㅼ갹??         File ID ?뷀샇??泥섎━
 *   2022.12.22  ?좎슜??         JSTL 而ㅼ뒪? ?쒓렇 異붽? 諛?湲곕뒫 蹂댁셿
 *   2024.10.29  ?대갚??         ?뺤쟻 ?꾨뱶 EgovFileMngController.cryptoService???뺤쟻 諛⑹떇?쇰줈 ?≪꽭??
 *   2025.05.31  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(吏??蹂??紐낅챸 洹쒖튃)
 *
 *      </pre>
 */
@Controller
public class EgovFileMngController {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovFileMngController.class);

	/** ?뷀샇?붿꽌鍮꾩뒪 */
	private static EgovEnvCryptoService cryptoService;

	@Resource(name = "EgovFileMngService")
	private EgovFileMngService fileService;

	@Resource(name = "egovEnvCryptoService")
	public void setEgovEnvCryptoService(EgovEnvCryptoService cryptoService) {
		EgovFileMngController.cryptoService = cryptoService;
	}

	/**
	 * 泥⑤??뚯씪?????紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param fileVO
	 * @param atchFileId
	 * @param sessionVO
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/cmm/fms/selectFileInfs.do")
	public String selectFileInfs(@ModelAttribute("searchVO") FileVO fileVO, HttpServletRequest request,
			@RequestParam Map<String, Object> commandMap, ModelMap model) throws Exception {

		String param_atchFileId = (String) commandMap.get("param_atchFileId");
		String decodedAtchFileId = "";

		if (param_atchFileId != null && !"".equals(param_atchFileId)) {
			decodedAtchFileId = cryptoService.decrypt(param_atchFileId);
		}

		fileVO.setAtchFileId(decodedAtchFileId);
		List<FileVO> result = fileService.selectFileInfs(fileVO);

		// FileId瑜??좎텛?섏? 紐삵븯?꾨줉 ?몄뀡ID? ?④퍡 ?뷀샇?뷀븯???쒖떆?쒕떎. (2022.12.06 異붽?) - ?뚯씪?꾩씠?붽? ?좎텛 遺덇??ν븯?꾨줉 議곗튂
		for (FileVO file : result) {
			String sessionId = request.getSession().getId();
			String toEncrypt = sessionId + "|" + file.atchFileId;
			file.setAtchFileId(Base64.getEncoder().encodeToString(cryptoService.encrypt(toEncrypt).getBytes()));
		}

		model.addAttribute("fileList", result);
		model.addAttribute("updateFlag", "N");
		model.addAttribute("fileListCnt", result.size());
		model.addAttribute("atchFileId", param_atchFileId);

		return "egovframework/com/cmm/fms/EgovFileList";
	}

	/**
	 * 泥⑤??뚯씪 蹂寃쎌쓣 ?꾪븳 ?섏젙?섏씠吏濡??대룞?쒕떎.
	 *
	 * @param fileVO
	 * @param atchFileId
	 * @param sessionVO
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/cmm/fms/selectFileInfsForUpdate.do")
	public String selectFileInfsForUpdate(@ModelAttribute("searchVO") FileVO fileVO,
			@RequestParam Map<String, Object> commandMap,
			// SessionVO sessionVO,
			HttpServletRequest request, ModelMap model) throws Exception {

		String param_atchFileId = (String) commandMap.get("param_atchFileId");
		String decodedAtchFileId = "";

		if (param_atchFileId != null && !"".equals(param_atchFileId)) {
			decodedAtchFileId = cryptoService.decrypt(param_atchFileId);
		}

		fileVO.setAtchFileId(decodedAtchFileId);

		List<FileVO> result = fileService.selectFileInfs(fileVO);

		// FileId瑜??좎텛?섏? 紐삵븯?꾨줉 ?몄뀡ID? ?④퍡 ?뷀샇?뷀븯???쒖떆?쒕떎. (2022.12.06 異붽?) - ?뚯씪?꾩씠?붽? ?좎텛 遺덇??ν븯?꾨줉 議곗튂
		for (FileVO file : result) {
			String sessionId = request.getSession().getId();
			String toEncrypt = sessionId + "|" + file.atchFileId;
			file.setAtchFileId(Base64.getEncoder().encodeToString(cryptoService.encrypt(toEncrypt).getBytes()));
		}

		model.addAttribute("fileList", result);
		model.addAttribute("updateFlag", "Y");
		model.addAttribute("fileListCnt", result.size());
		model.addAttribute("atchFileId", param_atchFileId);

		return "egovframework/com/cmm/fms/EgovFileList";
	}

	/**
	 * 泥⑤??뚯씪???????젣瑜?泥섎━?쒕떎.
	 *
	 * @param fileVO
	 * @param returnUrl
	 * @param sessionVO
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/cmm/fms/deleteFileInfs.do")
	public String deleteFileInf(@ModelAttribute("searchVO") FileVO fileVO,
			// SessionVO sessionVO,
			HttpServletRequest request, ModelMap model) throws Exception {

		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (isAuthenticated) {
			fileService.deleteFileInf(fileVO);
		}

		return "blank";

		// --------------------------------------------
		// contextRoot媛 ?덈뒗 寃쎌슦 ?쒖쇅 ?쒖폒????
		// --------------------------------------------
		//// return "forward:/cmm/fms/selectFileInfs.do";
		// return "forward:" + returnUrl;
		/*
		 * ******************************************************* modify by jdh
		 *******************************************************
		 * if ("".equals(request.getContextPath()) ||
		 * "/".equals(request.getContextPath())) { return "forward:" + returnUrl; }
		 * 
		 * if (returnUrl.startsWith(request.getContextPath())) { return "forward:" +
		 * returnUrl.substring(returnUrl.indexOf("/", 1)); } else { return "forward:" +
		 * returnUrl; }
		 */
		//// ------------------------------------------
	}

	/**
	 * ?먮낯 臾몄옄?댁쓣 ?뷀샇???섎뒗 硫붿꽌??
	 * 
	 * @param source ?먮낯 臾몄옄??
	 * @return ?뷀샇??臾몄옄??
	 */
	public static String encrypt(String atchFileId) {
		String returnVal = "";
		if (atchFileId != null && !"".equals(atchFileId)) {
			returnVal = cryptoService.encrypt(atchFileId);
		}
		return returnVal;
	}

	/**
	 * ?먮낯 臾몄옄?댁쓣 ?뷀샇???섎뒗 硫붿꽌??
	 * 
	 * @param source ?먮낯 臾몄옄??
	 * @return ?뷀샇??臾몄옄??
	 */
	public static String encryptSession(String atchFileId, String sessionId) {
		String returnVal = "";
		if (atchFileId != null && !"".equals(atchFileId)) {
			String toEncrypt = sessionId + "|" + atchFileId;
			returnVal = Base64.getEncoder().encodeToString(cryptoService.encrypt(toEncrypt).getBytes());
		}
		return returnVal;
	}

	/**
	 * ?뷀샇??臾몄옄?댁쓣 蹂듯샇???섎뒗 硫붿꽌??
	 * 
	 * @param source ?뷀샇??臾몄옄??
	 * @return ?먮낯 臾몄옄??
	 */
	public static String decrypt(String base64AtchFileId) {
		String returnVal = "FILE_ID_DECRIPT_EXCEPTION_02";
		if (base64AtchFileId != null && !"".equals(base64AtchFileId)) {
			try {
				returnVal = cryptoService.decrypt(base64AtchFileId);
			} catch (Exception e) {
				LOGGER.debug(e.getMessage());
			}
		}
		return returnVal;
	}

}
