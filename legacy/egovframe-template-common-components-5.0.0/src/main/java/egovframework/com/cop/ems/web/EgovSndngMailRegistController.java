package egovframework.com.cop.ems.web;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.EgovFileMngService;
import egovframework.com.cmm.service.EgovFileMngUtil;
import egovframework.com.cmm.service.FileVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.cop.ems.service.EgovSndngMailRegistService;
import egovframework.com.cop.ems.service.SndngMailVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;

/**
 * 諛쒖넚硫붿씪?깅줉, 諛쒖넚?붿껌XML?뚯씪 ?앹꽦?섎뒗 而⑦듃濡ㅻ윭 ?대옒??
 * 
 * @author 怨듯넻?쒕퉬??媛쒕컻? 諛뺤???
 * @since 2009.03.12
 * @version 1.0
 * @see
 * 
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.12  諛뺤???         理쒖큹 ?앹꽦
 *   2011.12.06  ?닿린??         硫붿씪 泥⑤??뚯씪??湲곕뒫 異붽?
 *   2015.05.08  議곗젙援?         ?ㅻ쪟?섏씠吏 ?쒖떆 寃쎈줈 ?섏젙 - insertSndngMail()
 *   2025.06.05  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(吏??蹂??紐낅챸 洹쒖튃)
 *
 *      </pre>
 */
@Controller
public class EgovSndngMailRegistController {

	/** EgovSndngMailRegistService */
	@Resource(name = "sndngMailRegistService")
	private EgovSndngMailRegistService sndngMailRegistService;

	/** EgovFileMngService */
	@Resource(name = "EgovFileMngService")
	private EgovFileMngService fileMngService;

	/** EgovFileMngUtil */
	@Resource(name = "EgovFileMngUtil")
	private EgovFileMngUtil fileUtil;

	/** ?뚯씪援щ텇??*/
	static final char FILE_SEPARATOR = File.separatorChar;

	/**
	 * 諛쒖넚硫붿씪 ?깅줉?붾㈃?쇰줈 ?ㅼ뼱媛꾨떎
	 * 
	 * @param sndngMailVO SndngMailVO
	 * @return String
	 * @exception Exception
	 */
	@IncludedInfo(name = "硫붿씪諛쒖넚", order = 360, gid = 40)
	@RequestMapping(value = "/cop/ems/insertSndngMailView.do")
	public String insertSndngMailView(@ModelAttribute("sndngMailVO") SndngMailVO sndngMailVO, ModelMap model)
			throws Exception {

		model.addAttribute("resultInfo", sndngMailVO);
		return "egovframework/com/cop/ems/EgovMailRegist";
	}

	/**
	 * 諛쒖넚硫붿씪???깅줉?쒕떎
	 * 
	 * @param multiRequest MultipartHttpServletRequest
	 * @param sndngMailVO  SndngMailVO
	 * @return String
	 * @exception Exception
	 */
	@RequestMapping(value = "/cop/ems/insertSndngMail.do")
	public String insertSndngMail(final MultipartHttpServletRequest multiRequest,
			@ModelAttribute("sndngMailVO") SndngMailVO sndngMailVO, ModelMap model, HttpServletRequest request)
			throws Exception {

		String link = "N";
		if (sndngMailVO != null && sndngMailVO.getLink() != null && !sndngMailVO.getLink().equals("")) {
			link = sndngMailVO.getLink();
		}

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		// KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?좎슜??
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (!isAuthenticated) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		List<FileVO> fvoList = new ArrayList<FileVO>();
		String atchFileId = "";
		final Map<String, MultipartFile> files = multiRequest.getFileMap();
		if (!files.isEmpty()) {
			fvoList = fileUtil.parseFileInf(files, "MSG_", 0, "", "");
			atchFileId = fileMngService.insertFileInfs(fvoList); // ?뚯씪???앹꽦?섍퀬?섎㈃ ?앹꽦??泥⑤??뚯씪 ID瑜?由ы꽩?쒕떎.

		}

		String orignlFileList = "";

		for (int i = 0; i < fvoList.size(); i++) {
			FileVO fileVO = fvoList.get(i);
			orignlFileList = fileVO.getOrignlFileNm();
		}

		if (sndngMailVO != null) {
			sndngMailVO.setAtchFileId(atchFileId);
			sndngMailVO.setDsptchPerson(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
			sndngMailVO.setOrignlFileNm(orignlFileList);
		}

		// 諛쒖넚硫붿씪???깅줉?쒕떎.
		boolean result = sndngMailRegistService.insertSndngMail(sndngMailVO);
		if (result) {
			if (link.equals("N")) {
				return "redirect:/cop/ems/selectSndngMailList.do";
			} else {
				model.addAttribute("closeYn", "Y");
				return "egovframework/com/cop/ems/EgovMailRegist";
			}
		} else {
			return "egovframework/com/cmm/error/egovError";
		}
	}

	/**
	 * 諛쒖넚硫붿씪 ?댁슜議고쉶濡??뚯븘媛꾨떎.
	 * 
	 * @param sndngMailVO SndngMailVO
	 * @return String
	 * @exception Exception
	 */
	@RequestMapping(value = "/cop/ems/backSndngMailRegist.do")
	public String backSndngMailRegist(@ModelAttribute("sndngMailVO") SndngMailVO sndngMailVO, ModelMap model)
			throws Exception {

		return "redirect:/cop/ems/selectSndngMailList.do";
	}
}
