package egovframework.com.utl.wed.web;

import java.io.FileNotFoundException;
import java.util.List;

import org.egovframe.rte.fdl.crypto.EgovEnvCryptoService;
import org.egovframe.rte.fdl.crypto.EgovPasswordEncoder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.service.EgovProperties;
import egovframework.com.utl.fcc.service.EgovFileUploadUtil;
import egovframework.com.utl.fcc.service.EgovFormBasedFileUtil;
import egovframework.com.utl.fcc.service.EgovFormBasedFileVo;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * ?뱀뿉?뷀꽣 ?대?吏 upload 泥섎━ Controller
 * @author 怨듯넻而댄룷?뚰듃媛쒕컻? ?쒖꽦怨?
 * @since 2009.08.26
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??               ?섏젙??         ?섏젙?댁슜
 *  -----------   --------  ---------------------------
 *   2009.08.26   ?쒖꽦怨?         理쒖큹 ?앹꽦
 *   2017.08.31   ?λ룞??         path, physical ?뚮씪誘명꽣 ?몄텧 ?뷀샇??泥섎━
 *   2017.12.12   ?λ룞??         異쒕젰 紐⑤뱢 寃쎈줈 蹂寃?痍⑥빟??議곗튂
 *   2018.03.07   ?좎슜??         URLEncode 泥섎━
 *   2018.08.17   ?좎슜??         URL ?뷀샇??蹂댁븞 異붽? 議곗튂
 *   2020.08.05   ?좎슜??         imageUploadCk Parameter ?섏젙
 *   2022.07.12   ?댁꽍怨?         二쇱꽍 ?뚮씪誘명꽣 type紐낃낵 蹂?섎챸 ?섏젙
 *
 * </pre>
 */
@Controller
public class EgovWebEditorImageController {

	/** 濡쒓렇?ㅼ젙 */
	private static final Logger LOGGER = LoggerFactory.getLogger(EgovWebEditorImageController.class);

	/** 泥⑤??뚯씪 ?꾩튂 吏?? => globals.properties */
	private final String uploadDir = EgovProperties.getProperty("Globals.fileStorePath");

	/** ?덉슜???뺤옣?먮? .?뺤옣???뺥깭濡??곕떖??湲곗닠?쒕떎. ex) .gif.jpg.jpeg.png => globals.properties */
	private final String extWhiteList = EgovProperties.getProperty("Globals.fileDownload.Extensions");

	/** 泥⑤? 理쒕? ?뚯씪 ?ш린 吏??*/
	private final long maxFileSize = 1024L * 1024L * 100L;   //?낅줈??理쒕? ?ъ씠利??ㅼ젙 (100M)

	/** ?뷀샇?붿꽌鍮꾩뒪 */
	@Resource(name = "egovEnvCryptoService")
	EgovEnvCryptoService cryptoService;

	@Resource(name = "egovEnvPasswordEncoderService")
	EgovPasswordEncoder egovPasswordEncoder;

	/** EgovMessageSource */
	@Resource(name="egovMessageSource")
	EgovMessageSource egovMessageSource;

	/**
	 * ?대?吏 Upload ?붾㈃?쇰줈 ?대룞?쒕떎.
	 *
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping(value="/utl/wed/insertImage.do", method=RequestMethod.GET)
	public String goInsertImage(Model model) throws Exception {

		return "egovframework/com/utl/wed/EgovInsertImage";
	}


	/**
	 * ?대?吏 Upload瑜?泥섎━?쒕떎.
	 *
	 * @param request
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping(value="/utl/wed/insertImage.do", method=RequestMethod.POST)
	public String imageUpload(MultipartHttpServletRequest request, Model model) throws Exception {

		uploadImageFiles(request, model);
		return "egovframework/com/utl/wed/EgovInsertImage";
	}

	/**
	 * ?대?吏 Upload(CK?먮뵒??瑜?泥섎━?쒕떎.
	 *
	 * @param ckEditorFuncNum
	 * @param mRequest
	 * @param response
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping(value="/utl/wed/insertImageCk.do", method=RequestMethod.POST)
	public String imageUploadCk(@RequestParam(value="CKEditorFuncNum", required=false) String ckEditorFuncNum, MultipartHttpServletRequest mRequest, HttpServletResponse response, Model model) throws Exception {
		// Spring multipartResolver 誘몄궗????(commons-fileupload ?쒖슜)
		//List<EgovFormBasedFileVo> list = EgovFormBasedFileUtil.uploadFiles(request, uploadDir, maxFileSize);
		model.addAttribute("ckEditorFuncNum", ckEditorFuncNum);
		uploadImageFiles(mRequest, model);
		return "egovframework/com/utl/wed/EgovUploadImageComplete";
	}

	/**
	 * @param mRequest
	 * @param model
	 * @throws Exception
	 */
	private void uploadImageFiles(MultipartHttpServletRequest mRequest, Model model) throws Exception {

		try {
			List<EgovFormBasedFileVo> list = EgovFileUploadUtil.uploadFilesExt(mRequest, uploadDir, maxFileSize, extWhiteList);
			if (list.size() > 0) {
				EgovFormBasedFileVo vo = list.get(0);	// 泥ル쾲吏??대?吏

				String url = mRequest.getContextPath()
						+ "/utl/web/imageSrc.do?"
						+ "path=" + this.encrypt(vo.getServerSubPath())
						+ "&physical=" + this.encrypt(vo.getPhysicalName())
						+ "&contentType=" + this.encrypt(vo.getContentType());

				model.addAttribute("url", url);
				model.addAttribute("msg",egovMessageSource.getMessage("success.file.transfer"));
			}
		} catch (SecurityException e) {
			model.addAttribute("url", "");
			model.addAttribute("msg",egovMessageSource.getMessage("errors.file.extension"));
		} catch (Exception e) {
			LOGGER.error(e.getMessage());
			model.addAttribute("url", "");
			model.addAttribute("msg",egovMessageSource.getMessage("errors.file.transfer"));
		}
	}

	/**
	 * ?대?吏 view瑜??쒓났?쒕떎.
	 *
	 * @param request
	 * @param response
	 * @throws Exception
	 */
	@RequestMapping(value="/utl/web/imageSrc.do",method=RequestMethod.GET)
	public void download(HttpServletRequest request, HttpServletResponse response) throws Exception {
		//2017.12.12 - 異쒕젰 紐⑤뱢 寃쎈줈 蹂寃?痍⑥빟??議곗튂
		//KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
		String subPath = this.decrypt(EgovStringUtil.isNullToString(request.getParameter("path")));
		String physical = this.decrypt(EgovStringUtil.isNullToString(request.getParameter("physical")));
		String mimeType = this.decrypt(EgovStringUtil.isNullToString(request.getParameter("contentType")));

		if ((subPath.indexOf("..") >= 0) || (physical.indexOf("..") >= 0) ) {
			throw new Exception("Security Exception - illegal url called.");
		}

		String ext = "";
		if ( physical.lastIndexOf(".") > 0 ) {
			ext = physical.substring(physical.lastIndexOf(".") + 1,physical.length()).toLowerCase();
		}
		if ( ext == null ) {
			throw new FileNotFoundException();
		}

		if ( extWhiteList.indexOf(ext) >= 0 ) {
			EgovFormBasedFileUtil.viewFile(response, uploadDir, subPath, physical, mimeType);
		} else {
			throw new FileNotFoundException();
		}
	}

	/**
	 * ?뷀샇??
	 *
	 * @param encrypt
	 * @return
	 */
	private String encrypt(String encrypt) {

		try {
			return cryptoService.encrypt(encrypt); // Handles URLEncoding.
			//return cryptoService.encryptNone(encrypt); // Does not handle URLEncoding.
		} catch(IllegalArgumentException e) {
			LOGGER.error("[IllegalArgumentException] Try/Catch...usingParameters Running : "+ e.getMessage());
		}
		return encrypt;
	}

	/**
	 * 蹂듯샇??
	 *
	 * @param decrypt
	 * @return
	 */
	private String decrypt(String decrypt){

		try {
			//return cryptoService.decrypt(decrypt); // Handles URLDecoding.
			return cryptoService.decryptNone(decrypt); // Does not handle URLDecoding.
		} catch(IllegalArgumentException e) {
			LOGGER.error("[IllegalArgumentException] Try/Catch...usingParameters Running : "+ e.getMessage());
		}
		return decrypt;
	}

}