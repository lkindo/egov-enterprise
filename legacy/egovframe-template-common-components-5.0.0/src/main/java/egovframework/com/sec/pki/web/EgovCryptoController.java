package egovframework.com.sec.pki.web;

import java.util.Map;

import org.egovframe.rte.fdl.crypto.EgovEnvCryptoService;
import org.egovframe.rte.fdl.crypto.EgovPasswordEncoder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import jakarta.annotation.Resource;

/**
 * ?뷀샇??蹂듯샇??愿??controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?좎슜??
 * @since 2018.12.03
 * @version 3.8
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *  ?섏젙??              ?섏젙??             ?섏젙?댁슜
 *  ----------   --------    ---------------------------
 *  2018.12.03   ?좎슜??             理쒖큹 ?앹꽦
 * </pre>
 */

@Controller
public class EgovCryptoController {

    /** 濡쒓렇?ㅼ젙 */
	private static final Logger LOGGER = LoggerFactory.getLogger(EgovCryptoController.class);

	/** ?뷀샇?붿꽌鍮꾩뒪 */
	@Resource(name = "egovEnvCryptoService")
	EgovEnvCryptoService cryptoService;

	@Resource(name = "egovEnvPasswordEncoderService")
	EgovPasswordEncoder egovPasswordEncoder;

	/** EgovMessageSource */
    @Resource(name="egovMessageSource")
    EgovMessageSource egovMessageSource;

    /**
     * ?뷀샇??蹂듯샇???낅젰 諛??붿껌 ?섏씠吏瑜??몄텧?쒕떎.
     *
     * @return
     */
	@IncludedInfo(name="?뷀샇??蹂듯샇??, listUrl="/sec/pki/EgovCryptoInfo.do", order = 2200 ,gid = 90)
    @RequestMapping(value="/sec/pki/EgovCryptoInfo.do")
    public String displayCryptoInfo( @RequestParam Map<?, ?> commandMap,
							    		ModelMap model) throws Exception {
        // 0. Spring Security ?ъ슜?먭텒??泥섎━
    	Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
    	if(!isAuthenticated) {
    		model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
        	return "redirect:/uat/uia/egovLoginUsr.do";
    	}

    	String plainText = (String)commandMap.get("plainText");

    	if ( plainText != null ) {

	    	int plainTextLen = plainText.length();
	    	String cryptText = encrypt(plainText);
	    	String decryptText = decrypt(cryptText);
	    	int decryptTextLen = decryptText.length();

	    	model.addAttribute("plainText", plainText);
	    	model.addAttribute("plainTextLen", plainTextLen);
	    	model.addAttribute("cryptText", cryptText);
	    	model.addAttribute("decryptText", decryptText);
	    	model.addAttribute("decryptTextLen", decryptTextLen);
    	}

    	return "egovframework/com/sec/pki/EgovCryptoInfo";
    }

    /**
     * ?뷀샇??
     *
     * @param encrypt
     */
    private String encrypt(String encrypt) {

    	try {
    		//return cryptoService.encrypt(encrypt); // Handles URLEncoding.
			return cryptoService.encryptNone(encrypt); // Does not handle URLEncoding.
        } catch(IllegalArgumentException e) {
    		LOGGER.error("[IllegalArgumentException] Try/Catch...usingParameters Runing : "+ e.getMessage());
        }
		return encrypt;
    }

    /**
     * 蹂듯샇??
     *
     * @param decrypt
     */
    private String decrypt(String decrypt){

    	try {
    		//return cryptoService.decrypt(decrypt); // Handles URLDecoding.
			return cryptoService.decryptNone(decrypt); // Does not handle URLDecoding.
        } catch(IllegalArgumentException e) {
    		LOGGER.error("[IllegalArgumentException] Try/Catch...usingParameters Runing : "+ e.getMessage());
        }
		return decrypt;
    }

}