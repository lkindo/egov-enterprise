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

import com.company.project.service.file.EgovFileService;
import com.company.project.service.file.dto.FileDto;
import com.company.project.web.adapter.FileAdapter;

import egovframework.com.cmm.service.FileVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;

/**
 * ??? ?? ???? ?????? ??? ?????
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
 *   2016.10.13  ???         deleteFileInf ???return ????
 *   2022.12.02  ????         File ID ??????
 *   2022.12.22  ???         JSTL ???? ?? ?? ?????
 *   2024.10.29  ????         ? ? EgovFileMngController.cryptoService??? ??? ????
 *   2025.05.31  ????         PMD???????? ????????-LocalVariableNamingConventions(???????
 *
 *      </pre>
 **/
@Controller
public class EgovFileMngController {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovFileMngController.class);

	/** ???????**/
	private static EgovEnvCryptoService cryptoService;

	@Resource(name = "egovFileService")
	private EgovFileService fileService;

	@Resource(name = "egovEnvCryptoService")
	public void setEgovEnvCryptoService(EgovEnvCryptoService cryptoService) {
		EgovFileMngController.cryptoService = cryptoService;
	}

	/**
	 * ???????????????.
	 *
	 * @param fileVO
	 * @param atchFileId
	 * @param sessionVO
	 * @param model
	 * @return
	 * @throws Exception
	 **/
	@RequestMapping("/cmm/fms/selectFileInfs.do")
	public String selectFileInfs(@ModelAttribute("searchVO") FileVO fileVO, HttpServletRequest request,
			@RequestParam Map<String, Object> commandMap, ModelMap model) throws Exception {

		String param_atchFileId = (String) commandMap.get("param_atchFileId");
		String decodedAtchFileId = "";

		if (param_atchFileId != null && !"".equals(param_atchFileId)) {
			decodedAtchFileId = cryptoService.decrypt(param_atchFileId);
		}

		// New Service Integration
		List<FileDto> dtoList = fileService.getFileList(decodedAtchFileId);
		List<FileVO> result = FileAdapter.toVOList(dtoList);

		// FileId?????? ? ?D?? ?? ?????????. (2022.12.06 ??) - ?????? ? ???? ??
		for (FileVO file : result) {
			String sessionId = request.getSession().getId();
			String toEncrypt = sessionId + "|" + file.getAtchFileId();
			file.setAtchFileId(Base64.getEncoder().encodeToString(cryptoService.encrypt(toEncrypt).getBytes()));
		}

		model.addAttribute("fileList", result);
		model.addAttribute("updateFlag", "N");
		model.addAttribute("fileListCnt", result.size());
		model.addAttribute("atchFileId", param_atchFileId);

		return "egovframework/com/cmm/fms/EgovFileList";
	}

	/**
	 * ???? ??? ?????????.
	 *
	 * @param fileVO
	 * @param atchFileId
	 * @param sessionVO
	 * @param model
	 * @return
	 * @throws Exception
	 **/
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

		// New Service Integration
		List<FileDto> dtoList = fileService.getFileList(decodedAtchFileId);
		List<FileVO> result = FileAdapter.toVOList(dtoList);

		// FileId?????? ? ?D?? ?? ?????????. (2022.12.06 ??) - ?????? ? ???? ??
		for (FileVO file : result) {
			String sessionId = request.getSession().getId();
			String toEncrypt = sessionId + "|" + file.getAtchFileId();
			file.setAtchFileId(Base64.getEncoder().encodeToString(cryptoService.encrypt(toEncrypt).getBytes()));
		}

		model.addAttribute("fileList", result);
		model.addAttribute("updateFlag", "Y");
		model.addAttribute("fileListCnt", result.size());
		model.addAttribute("atchFileId", param_atchFileId);

		return "egovframework/com/cmm/fms/EgovFileList";
	}

	/**
	 * ?????????????????.
	 *
	 * @param fileVO
	 * @param returnUrl
	 * @param sessionVO
	 * @param model
	 * @return
	 * @throws Exception
	 **/
	@RequestMapping("/cmm/fms/deleteFileInfs.do")
	public String deleteFileInf(@ModelAttribute("searchVO") FileVO fileVO,
			// SessionVO sessionVO,
			HttpServletRequest request, ModelMap model) throws Exception {

		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (isAuthenticated) {
			// New Service Integration
			if (fileVO.getAtchFileId() != null && fileVO.getFileSn() != null) {
				fileService.deleteFile(fileVO.getAtchFileId(), Integer.parseInt(fileVO.getFileSn()));
			}
		}

		return "blank";
	}

	/**
	 * ?? ???? ?????? ??
	 * 
	 * @param source ?? ????
	 * @return ????????
	 **/
	public static String encrypt(String atchFileId) {
		String returnVal = "";
		if (atchFileId != null && !"".equals(atchFileId)) {
			returnVal = cryptoService.encrypt(atchFileId);
		}
		return returnVal;
	}

	/**
	 * ?? ???? ?????? ??
	 * 
	 * @param source ?? ????
	 * @return ????????
	 **/
	public static String encryptSession(String atchFileId, String sessionId) {
		String returnVal = "";
		if (atchFileId != null && !"".equals(atchFileId)) {
			String toEncrypt = sessionId + "|" + atchFileId;
			returnVal = Base64.getEncoder().encodeToString(cryptoService.encrypt(toEncrypt).getBytes());
		}
		return returnVal;
	}

	/**
	 * ???????? ????? ??
	 * 
	 * @param source ????????
	 * @return ?? ????
	 **/
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
