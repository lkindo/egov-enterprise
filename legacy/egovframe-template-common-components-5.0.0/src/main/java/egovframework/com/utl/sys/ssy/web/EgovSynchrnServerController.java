package egovframework.com.utl.sys.ssy.web;

import java.io.File;

import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.support.SessionStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.service.EgovFileMngUtil;
import egovframework.com.cmm.service.EgovProperties;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.utl.fcc.service.EgovFileUploadUtil;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import egovframework.com.utl.sys.ssy.service.EgovSynchrnServerService;
import egovframework.com.utl.sys.ssy.service.SynchrnServer;
import egovframework.com.utl.sys.ssy.service.SynchrnServerVO;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * <pre>
 * 媛쒖슂
 * - ?숆린?붾????쒕쾭愿由ъ뿉 ???controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?숆린?붾????쒕쾭愿由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - ?숆린?붾????쒕쾭愿由ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * </pre>
 * 
 * @author ?대Ц以
 * @since 2010.06.28
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.06.28  ?대Ц以          理쒖큹 ?앹꽦
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2019.12.09  ?좎슜??         KISA 蹂댁븞?쎌젏 議곗튂 (?꾪뿕???뺤떇 ?뚯씪 ?낅줈??
 *   2025.09.19  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-FieldNamingConventions(蹂?섎챸??諛묒쨪 ?ъ슜)
 *   2025.09.19  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-AvoidReassigningParameters(?섍꺼諛쏅뒗 硫붿냼??parameter 媛믪쓣 吏곸젒 蹂寃쏀븯??肄붾뱶 ?먯?)
 *   2025.09.19  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-SimplifyBooleanExpressions(boolean ?ъ슜 ??遺덊븘?뷀븳 鍮꾧탳 ?곗궛???쇳븯?꾨줉 ??
 *
 *      </pre>
 */
@Controller
public class EgovSynchrnServerController {

	@Resource(name = "egovSynchrnServerService")
	private EgovSynchrnServerService egovSynchrnServerService;

	@Resource(name = "egovMessageSource")
	private EgovMessageSource egovMessageSource;

	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService egovCmmUseService;

	/** ID Generation */
	@Resource(name = "egovSynchrnServerIdGnrService")
	private EgovIdGnrService egovSynchrnServerIdGnrService;

	@Resource(name = "EgovFileMngUtil")
	private EgovFileMngUtil fileUtil;

	final static String SYNTH_SERVER_PATH = EgovProperties.getProperty("Globals.SynchrnServerPath");
	//
                     static String uploadDir = "/product/jeus2/egovProps/tmp/upload/";
	//
                     static String uploadDir = "D:/ftp/";

	/**
	 * ?숆린?붾????쒕쾭愿由?紐⑸줉?붾㈃ ?대룞
	 * 
	 * @param synchrnServerVO - ?숆린?붾????쒕쾭 Vo
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/utl/sys/ssy/selectSynchrnServerListView.do")
	public String selectSynchrnServerListView(Model model) throws Exception {

		// ?뚯씪?낅줈???쒗븳
		String whiteListFileUploadExtensions = EgovProperties.getProperty("Globals.fileUpload.Extensions");
		String fileUploadMaxSize = EgovProperties.getProperty("Globals.fileUpload.maxSize");

		model.addAttribute("fileUploadExtensions", whiteListFileUploadExtensions);
		model.addAttribute("fileUploadMaxSize", fileUploadMaxSize);

		return "egovframework/com/utl/sys/ssy/EgovSynchrnServerList";
	}

	/**
	 * ?숆린?붾????쒕쾭?뺣낫瑜?愿由ы븯湲??꾪빐 ?깅줉???숆린?붾????쒕쾭紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param synchrnServerVO - ?숆린?붾????쒕쾭 Vo
	 * @return String - 由ы꽩 Url
	 */
	@IncludedInfo(name = "?뚯씪?숆린????곸꽌踰?", order = 2150, gid = 90)
	@RequestMapping(value = "/utl/sys/ssy/selectSynchrnServerList.do")
	public String selectSynchrnServerList(@ModelAttribute("synchrnServerVO") SynchrnServerVO synchrnServerVO,
			ModelMap model) throws Exception {

		// ?뚯씪?낅줈???쒗븳
		String whiteListFileUploadExtensions = EgovProperties.getProperty("Globals.fileUpload.Extensions");
		String fileUploadMaxSize = EgovProperties.getProperty("Globals.fileUpload.maxSize");

		/** paging */
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(synchrnServerVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(synchrnServerVO.getPageUnit());
		paginationInfo.setPageSize(synchrnServerVO.getPageSize());

		synchrnServerVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		synchrnServerVO.setLastIndex(paginationInfo.getLastRecordIndex());
		synchrnServerVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		synchrnServerVO.setSynchrnServerList(egovSynchrnServerService.selectSynchrnServerList(synchrnServerVO));

		model.addAttribute("synchrnServerList", synchrnServerVO.getSynchrnServerList());

		int totCnt = egovSynchrnServerService.selectSynchrnServerListTotCnt(synchrnServerVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);
		model.addAttribute("fileList", egovSynchrnServerService.getFileName());

		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		model.addAttribute("fileUploadExtensions", whiteListFileUploadExtensions);
		model.addAttribute("fileUploadMaxSize", fileUploadMaxSize);

		return "egovframework/com/utl/sys/ssy/EgovSynchrnServerList";
	}

	/**
	 * ?깅줉???숆린?붾????쒕쾭???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param synchrnServerVO - ?숆린?붾????쒕쾭 Vo
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/utl/sys/ssy/getSynchrnServer.do")
	public String selectSynchrnServer(@RequestParam("serverId") String serverId,
			@ModelAttribute("synchrnServerVO") SynchrnServerVO synchrnServerVO, ModelMap model) throws Exception {

		synchrnServerVO.setServerId(serverId);
		SynchrnServerVO synchrnServer = egovSynchrnServerService.selectSynchrnServer(synchrnServerVO);
		model.addAttribute("synchrnServer", synchrnServer);

		model.addAttribute("fileList", egovSynchrnServerService.selectSynchrnServerFiles(synchrnServer));
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/utl/sys/ssy/EgovSynchrnServerDetail";
	}

	/**
	 * ?깅줉???숆린?붾????쒕쾭???뚯씪????젣?쒕떎.
	 * 
	 * @param synchrnServerVO - ?숆린?붾????쒕쾭 Vo
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/utl/sys/ssy/removeSynchrnServerFile.do")
	public String deleteSynchrnServerFile(@RequestParam("serverId") String serverId,
		@RequestParam("fileNm") String fileNm,
		@ModelAttribute("synchrnServer") SynchrnServerVO synchrnServerVO) throws Exception {

		synchrnServerVO.setServerId(serverId);
		SynchrnServerVO synchrnServer = egovSynchrnServerService.selectSynchrnServer(synchrnServerVO);
		synchrnServer.setDeleteFileNm(fileNm);
		egovSynchrnServerService.deleteSynchrnServerFile(synchrnServer);
		return "forward:/utl/sys/ssy/getSynchrnServer.do";
	}

	/**
	 * ?깅줉???숆린?붾????쒕쾭???뚯씪???ㅼ슫濡쒕뱶 ?쒕떎.
	 * 
	 * @param serverId        - ?숆린?붾????쒕쾭 ID
	 * @param fileNm          - ?ㅼ슫濡쒕뱶 ????뚯씪
	 * @param synchrnServerVO - ?숆린?붾????쒕쾭 Vo
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/utl/sys/ssy/getSynchrnServerFile.do")
	public String downloadFtpFile(@RequestParam("serverId") String serverId,
		@RequestParam("fileNm") String fileNm,
		@ModelAttribute("synchrnServer") SynchrnServerVO synchrnServerVO) throws Exception {

		synchrnServerVO.setServerId(serverId);
		SynchrnServerVO synchrnServer = egovSynchrnServerService.selectSynchrnServer(synchrnServerVO);
		synchrnServer.setFilePath(SYNTH_SERVER_PATH);
		egovSynchrnServerService.downloadFtpFile(synchrnServer, fileNm);
		return "forward:/utl/sys/ssy/getSynchrnServer.do";
	}

	/**
	 * ?숆린?붾????쒕쾭?뺣낫 ?깅줉 ?붾㈃?쇰줈 ?대룞?쒕떎.
	 * 
	 * @param synchrnServer - ?숆린?붾????쒕쾭 model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/utl/sys/ssy/addViewSynchrnServer.do")
	public String insertViewSynchrnServer(@ModelAttribute("synchrnServerVO") SynchrnServerVO synchrnServerVO,
			ModelMap model) throws Exception {

		model.addAttribute("synchrnServer", synchrnServerVO);
		return "egovframework/com/utl/sys/ssy/EgovSynchrnServerRegist";
	}

	/**
	 * ?숆린?붾????쒕쾭?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * 
	 * @param synchrnServer - ?숆린?붾????쒕쾭 model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/utl/sys/ssy/addSynchrnServer.do")
	public String insertSynchrnServer(
		@ModelAttribute("synchrnServerVO") SynchrnServerVO synchrnServerVO,
		@Valid @ModelAttribute("synchrnServer") SynchrnServer synchrnServer,
		BindingResult bindingResult,
		ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			model.addAttribute("synchrnServerVO", synchrnServerVO);
			return "egovframework/com/utl/sys/ssy/EgovSynchrnServerRegist";
		} else {
			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated(); // KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?댁젙?)

			if (!isAuthenticated) {
				return "redirect:/uat/uia/egovLoginUsr.do";
			}
			synchrnServer.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
			// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
			if (!EgovStringUtil.isNullToString(synchrnServer.getSynchrnLc()).endsWith("/")) {
				synchrnServer.setSynchrnLc(EgovStringUtil.isNullToString(synchrnServer.getSynchrnLc()).concat("/"));
			}
			synchrnServer.setReflctAt("N");
			synchrnServer.setServerId(egovSynchrnServerIdGnrService.getNextStringId());

			model.addAttribute("synchrnServer",
					egovSynchrnServerService.insertSynchrnServer(synchrnServer, synchrnServerVO));
			model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));
			return "egovframework/com/utl/sys/ssy/EgovSynchrnServerDetail";
		}
	}

	/**
	 * 湲??깅줉???숆린?붾????쒕쾭?뺣낫瑜??섏젙?쒕떎.
	 * 
	 * @param synchrnServer - ?숆린?붾????쒕쾭 model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/utl/sys/ssy/updtViewSynchrnServer.do")
	public String updateViewSynchrnServer(@RequestParam("serverId") String serverId,
		@ModelAttribute("synchrnServerVO") SynchrnServerVO synchrnServerVO,
		Model model) throws Exception {
		synchrnServerVO.setServerId(serverId);
		model.addAttribute("synchrnServer", egovSynchrnServerService.selectSynchrnServer(synchrnServerVO));
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));
		return "egovframework/com/utl/sys/ssy/EgovSynchrnServerUpdt";
	}

	/**
	 * ?숆린?붾????쒕쾭?뺣낫 ?깅줉 ?붾㈃?쇰줈 ?대룞?쒕떎.
	 * 
	 * @param synchrnServer - ?숆린?붾????쒕쾭 model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/utl/sys/ssy/updtSynchrnServer.do")
	public String updateSynchrnServer(
		@Valid @ModelAttribute("synchrnServer") SynchrnServer synchrnServer,
		BindingResult bindingResult,
		SessionStatus status,
		ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			model.addAttribute("synchrnServerVO", synchrnServer);
			return "egovframework/com/utl/sys/ssy/EgovSynchrnServerUpdt";
		} else {
			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated(); // KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?댁젙?)

			if (!isAuthenticated) {
				return "redirect:/uat/uia/egovLoginUsr.do";
			}
			synchrnServer.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
			// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
			if (!EgovStringUtil.isNullToString(synchrnServer.getSynchrnLc()).endsWith("/")) {
				synchrnServer.setSynchrnLc(EgovStringUtil.isNullToString(synchrnServer.getSynchrnLc()).concat("/"));
			}
			egovSynchrnServerService.updateSynchrnServer(synchrnServer);
			status.setComplete();
			model.addAttribute("message", egovMessageSource.getMessage("success.common.update"));
			return "forward:/utl/sys/ssy/getSynchrnServer.do";
		}
	}

	/**
	 * 湲??깅줉???숆린?붾????쒕쾭?뺣낫瑜???젣?쒕떎.
	 * 
	 * @param synchrnServer - ?숆린?붾????쒕쾭 model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/utl/sys/ssy/removeSynchrnServer.do")
	public String deleteSynchrnServer(@RequestParam("serverId") String serverId,
			@ModelAttribute("synchrnServer") SynchrnServer synchrnServer, Model model) throws Exception {

		synchrnServer.setServerId(serverId);
		egovSynchrnServerService.deleteSynchrnServer(synchrnServer);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/utl/sys/ssy/selectSynchrnServerList.do";
	}

	/**
	 * ?낅줈???뚯씪???숆린?붾????쒕쾭?ㅼ쓣 ??곸쑝濡??숆린??泥섎━瑜??쒕떎.
	 * 
	 * @param synchrnServerVO - ?숆린?붾????쒕쾭 Vo
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/utl/sys/ssy/processSynchrn.do")
	public String processSynchrn(@ModelAttribute("synchrnServerVO") SynchrnServerVO synchrnServerVO, Model model)
			throws Exception {

		synchrnServerVO.setFilePath(SYNTH_SERVER_PATH);
		File uploadFile = new File(SYNTH_SERVER_PATH);
		File[] fileList = uploadFile.listFiles();

		synchrnServerVO.setReflctAt("N");

		if (fileList != null) {
			egovSynchrnServerService.processSynchrn(synchrnServerVO, fileList);
		}

		/*
		for(int i=0; i<fileList.length; i++) {
		    if(fileList[i].isFile()) {
		    	egovSynchrnServerService.processSynchrn(synchrnServerVO, fileList[i]);
		    }
		}
		*/

		return "forward:/utl/sys/ssy/selectSynchrnServerList.do";
	}

	/**
	 * ?숆린??????뚯씪???낅줈???쒕떎.
	 * 
	 * @param synchrnServerVO - ?숆린?붾????쒕쾭 Vo
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/utl/sys/ssy/uploadFile.do")
	public String uploadFile(final MultipartHttpServletRequest multiRequest,
		@ModelAttribute("synchrnServer") SynchrnServerVO synchrnServerVO, Model model) throws Exception {

		MultipartFile multipartFile = multiRequest.getFile("file");
		if (multipartFile != null) {//2022.01 Possible null pointer dereference due to return value of called method
			String fileName = multipartFile.getOriginalFilename();
			String extension = EgovFileUploadUtil.getFileExtension(fileName);

			// ?뚯씪?낅줈???쒗븳
			String whiteListFileUploadExtensions = EgovProperties.getProperty("Globals.fileUpload.Extensions");
			long maxFileSize = Long.parseLong(EgovProperties.getProperty("Globals.fileUpload.maxSize"));
			long fileSize = multipartFile.getSize();

			boolean resultFileExtention = EgovFileUploadUtil.checkFileExtension(fileName,
				whiteListFileUploadExtensions);
			boolean resultFileMaxSize = EgovFileUploadUtil.checkFileMaxSize(multipartFile, maxFileSize);

			if (resultFileExtention && resultFileMaxSize) { // true = ?덉슜
				egovSynchrnServerService.writeFile(multipartFile, fileName, synchrnServerVO);
			} else {
				if (!resultFileExtention) {
					model.addAttribute("fileUploadResultMessage", "* ?덉슜?섏? ?딅뒗 ?뺤옣???낅땲??[" + extension + "]");
				}
				if (!resultFileMaxSize) {
					model.addAttribute("fileUploadResultMessage",
						"* ?덉슜?섏? ?딅뒗 ?뚯씪 ?ъ씠利??낅땲??[" + fileName + " : " + fileSize + " bytes / " + maxFileSize + " bytes]");
				}
			}

		}

		return "forward:/utl/sys/ssy/selectSynchrnServerList.do";
	}

	/**
	 * ?낅줈???뚯씪????젣?쒕떎.
	 * 
	 * @param deleteFiles - ?낅줈???뚯씪 紐⑸줉
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/utl/sys/ssy/deleteFile.do")
	public String deleteFile(@RequestParam("deleteFiles") String deleteFiles,
		@ModelAttribute("synchrnServerVO") SynchrnServerVO synchrnServerVO) throws Exception {

		synchrnServerVO.setReflctAt("");
		egovSynchrnServerService.deleteFile(deleteFiles, synchrnServerVO);

		return "forward:/utl/sys/ssy/selectSynchrnServerList.do";
	}

}
