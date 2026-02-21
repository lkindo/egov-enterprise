package egovframework.com.cmm.web;

import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

import org.egovframe.rte.fdl.crypto.EgovEnvCryptoService;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.EgovWebUtil;
import jakarta.annotation.Resource;

/**
 * @Class Name : EgovComUtlController.java
 * @Description : ?????????? Controller
 * @Modification Information
 * @
 *   @ ????????????
 *   @ ---------- -------- ---------------------------
 *   2009.03.02 ???????
 *   2011.10.07 ????.action -> .do???? ?? ???? ????
 *   2015.11.12 ? ?????????????
 *   2019.04.25 ???moveToPage() ???? ??
 *   2022.11.11 ??? ????????
 *   2023.05.23 ???moveToPage() ?? ????
 *   2024.07.08 ???decryptId(), encryptId() ??
 *
 * @author ???????? ???
 * @since 2009.03.02
 * @version 1.0
 * @see
 *
 **/
@Controller
public class EgovComUtlController {

	// @Resource(name = "egovUserManageService")
	// private EgovUserManageService egovUserManageService;
	private static final Logger LOGGER = LoggerFactory.getLogger(EgovComUtlController.class);

	/** ???????**/
	private static EgovEnvCryptoService cryptoService;

	@Resource(name = "egovPageLinkWhitelist")
	protected List<String> egovWhitelist;

	/** EgovPropertyService **/
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	@Resource(name = "egovEnvCryptoService")
	public void setEgovEnvCryptoService(EgovEnvCryptoService cryptoService) {
		EgovComUtlController.cryptoService = cryptoService;
	}

	/**
	 * JSP ?????? ?????
	 **/
	@RequestMapping(value = "/EgovPageLink.do")
	public String moveToPage(
			@RequestParam(value = "linkIndex", required = true, defaultValue = "0") Integer linkIndex) {

		String link = "";
		// ?????? ???? ?
		if (egovWhitelist == null || egovWhitelist.isEmpty() || egovWhitelist.size() <= linkIndex) {
			link = "egovframework/com/cmm/egovError";
			return link;
		}

		link = egovWhitelist.get(linkIndex);

		link = link.replace(";", "");
		link = link.replace("%", "");
		link = link.replace(".", "");

		// ????????????
		link = EgovWebUtil.filePathBlackList(link);

		return link;
	}

	/**
	 * ??
	 * 
	 * @return String
	 * @exception Exception
	 **/
	@RequestMapping(value = "/EgovModal.do")
	public String selectUtlJsonInquire() throws Exception {
		return "egovframework/com/cmm/EgovModal";
	}

	/**
	 * validato rule dynamic Javascript
	 **/
	@RequestMapping("/validator.do")
	public String validate() {
		return "egovframework/com/cmm/validator";
	}

	/**
	 * ???????? ????? ??
	 * 
	 * @param source ????????
	 * @return ?? ????
	 **/
	public static String decryptId(String base64CipherId) {
		String returnVal = "CIPHER_ID_DECRIPT_EXCEPTION_02";
		if (base64CipherId != null && !"".equals(base64CipherId)) {
			try {
				returnVal = cryptoService.decrypt(base64CipherId);
			} catch (Exception e) {
				LOGGER.debug(e.getMessage());
			}
		}
		return returnVal;
	}

	/**
	 * ?? ???? ?????? ??
	 * 
	 * @param source ?? ????
	 * @return ????????Base64 Format, UrlDecode)
	 **/
	public String encryptId(String plainTextId) {
		String returnVal = "";
		if (plainTextId != null && !"".equals(plainTextId)) {
			returnVal = cryptoService.encrypt(plainTextId);
			try {
				returnVal = URLDecoder.decode(returnVal, StandardCharsets.UTF_8.name());
			} catch (UnsupportedEncodingException e) {
				returnVal = "";
				LOGGER.error("UrlDecode error when encrypting ID");
			}
		}
		return returnVal;
	}

}
