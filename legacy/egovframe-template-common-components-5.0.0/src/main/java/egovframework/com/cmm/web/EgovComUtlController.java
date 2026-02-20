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
 * @Description : 怨듯넻?좏떥由ы떚???묒뾽???꾪븳 Controller
 * @Modification Information
 * @
 * @ ?섏젙??             ?섏젙??         ?섏젙?댁슜
 * @ ----------  --------  ---------------------------
 *   2009.03.02  議곗옱??     理쒖큹 ?앹꽦
 *   2011.10.07  ?닿린??     .action -> .do濡?蹂寃쏀븯硫댁꽌 ?숈씪 留ㅽ븨???섏뼱 ??젣泥섎━
 *   2015.11.12  源?고샇      ?쒓뎅?명꽣?룹쭊?μ썝 ??痍⑥빟??媛쒖꽑
 *   2019.04.25  ?좎슜??     moveToPage() ?붿씠?몃━?ㅽ듃 泥섎━
 *   2022.11.11  源?쒖?      ?쒗걧?댁퐫??泥섎━
 *   2023.05.23  ?좎슜??     moveToPage() 異붽? 蹂댁셿 議곗튂
 *   2024.07.08  ?좎슜??     decryptId(), encryptId() 異붽?
 *
 *  @author 怨듯넻?쒕퉬??媛쒕컻? 議곗옱??
 *  @since 2009.03.02
 *  @version 1.0
 *  @see
 *
 */
@Controller
public class EgovComUtlController {

    //@Resource(name = "egovUserManageService")
    //private EgovUserManageService egovUserManageService;
	private static final Logger LOGGER = LoggerFactory.getLogger(EgovComUtlController.class);
	
	/** ?뷀샇?붿꽌鍮꾩뒪 */
	private static EgovEnvCryptoService cryptoService;
	

	@Resource(name = "egovPageLinkWhitelist")
    protected List<String> egovWhitelist;

    /** EgovPropertyService */
    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

	@Resource(name = "egovEnvCryptoService")
	public void setEgovEnvCryptoService(EgovEnvCryptoService cryptoService) {
		this.cryptoService = cryptoService;
	}

   
    /**
	 * JSP ?몄텧?묒뾽留?泥섎━?섎뒗 怨듯넻 ?⑥닔
	 */
	@RequestMapping(value="/EgovPageLink.do")
	public String moveToPage(@RequestParam(value="linkIndex",required=true,defaultValue="0") Integer linkIndex){

		String link = "";
		// ?붿씠??由ъ뒪?멸? 鍮꾩뿀?붿? ?뺤씤
		if (egovWhitelist == null || egovWhitelist.isEmpty() || egovWhitelist.size() <= linkIndex) {
			link="egovframework/com/cmm/egovError";
			return link;
		}

		link = egovWhitelist.get(linkIndex);
		
		link = link.replace(";", "");
		link = link.replace("%", "");
		link = link.replace(".", "");

		// ?덉쟾??寃쎈줈 臾몄옄?대줈 議곗튂
		link = EgovWebUtil.filePathBlackList(link);
		
		return link;
	}
	
    /**
	 * 紐⑤떖議고쉶
	 * @return String
	 * @exception Exception
	 */
    @RequestMapping(value="/EgovModal.do")
    public String selectUtlJsonInquire()  throws Exception {
        return "egovframework/com/cmm/EgovModal";
    }
    
    /**
	 * validato rule dynamic Javascript
	 */
	@RequestMapping("/validator.do")
	public String validate(){
		return "egovframework/com/cmm/validator";
	}

	
	/**
	 * ?뷀샇??臾몄옄?댁쓣 蹂듯샇???섎뒗 硫붿꽌??
	 * @param source ?뷀샇??臾몄옄??
	 * @return ?먮낯 臾몄옄??
	 */
	public static String decryptId(String base64CipherId) {
		String returnVal = "CIPHER_ID_DECRIPT_EXCEPTION_02";
		if (base64CipherId!=null && !"".equals(base64CipherId)) {
			try {
				returnVal = cryptoService.decrypt(base64CipherId);
			} catch (Exception e) {
				LOGGER.debug(e.getMessage());
			}
		}
		return returnVal;
	}
	
	/**
	 * ?먮낯 臾몄옄?댁쓣 ?뷀샇???섎뒗 硫붿꽌??
	 * @param source ?먮낯 臾몄옄??
	 * @return ?뷀샇??臾몄옄??Base64 Format, UrlDecode)
	 */
	public static String encryptId(String plainTextId) {
		String returnVal = "";
		if (plainTextId!=null && !"".equals(plainTextId)) {
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