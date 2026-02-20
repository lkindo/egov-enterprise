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
 * ??
 * - ?????????? ????controller ?????? ???.
 *
 * ???
 * - ?????????? ?????, ??, ???? ?????????.
 * - ?????????? ??? ?, ??????.
 * </pre>
 * 
 * @author ??
 * @since 2010.06.28
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2010.06.28  ??          ????
 *   2011.08.26  ???         IncludedInfo annotation ??
 *   2019.12.09  ???         KISA ?? ??(???? ??? ????
 *   2025.09.19  ????         2025????????PMD???????? ????????-FieldNamingConventions(?????????
 *   2025.09.19  ????         2025????????PMD???????? ????????-AvoidReassigningParameters(???????parameter ????????????)
 *   2025.09.19  ????         2025????????PMD???????? ????????-SimplifyBooleanExpressions(boolean ??????????????????? ??
 *
 *      </pre>
 **/
@Controller
public class EgovSynchrnServerController {

	@Resource(name = "egovSynchrnServerService")
	private EgovSynchrnServerService egovSynchrnServerService;

	@Resource(name = "egovMessageSource")
	private EgovMessageSource egovMessageSource;

	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService egovCmmUseService;

	/** ID Generation **/
	@Resource(name = "egovSynchrnServerIdGnrService")
	private EgovIdGnrService egovSynchrnServerIdGnrService;

	@Resource(name = "EgovFileMngUtil")
	private EgovFileMngUtil fileUtil;

	final static String SYNTH_SERVER_PATH = EgovProperties.getProperty("Globals.SynchrnServerPath");
	// final static String uploadDir = "/product/jeus2/egovProps/tmp/upload/";
	// final static String uploadDir = "D:/ftp/";

	/**
	 * ???????????? ???
	 * 
	 * @param synchrnServerVO - ???????? Vo
	 * @return String - ? Url
	 **/
	@RequestMapping(value = "/utl/sys/ssy/selectSynchrnServerListView.do")
	public String selectSynchrnServerListView(Model model) throws Exception {

		// ?????????
		String whiteListFileUploadExtensions = EgovProperties.getProperty("Globals.fileUpload.Extensions");
		String fileUploadMaxSize = EgovProperties.getProperty("Globals.fileUpload.maxSize");

		model.addAttribute("fileUploadExtensions", whiteListFileUploadExtensions);
		model.addAttribute("fileUploadMaxSize", fileUploadMaxSize);

		return "egovframework/com/utl/sys/ssy/EgovSynchrnServerList";
	}

	/**
	 * ??????????????? ????????????????.
	 * 
	 * @param synchrnServerVO - ???????? Vo
	 * @return String - ? Url
	 **/
	@IncludedInfo(name = "Legacy Controller", order = 2150, gid = 90)
	@RequestMapping(value = "/utl/sys/ssy/selectSynchrnServerList.do")
	public String selectSynchrnServerList(@ModelAttribute("synchrnServerVO") SynchrnServerVO synchrnServerVO,
			ModelMap model) throws Exception {

		// ?????????
		String whiteListFileUploadExtensions = EgovProperties.getProperty("Globals.fileUpload.Extensions");
		String fileUploadMaxSize = EgovProperties.getProperty("Globals.fileUpload.maxSize");

		/** paging **/
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
	 * ????????????????????.
	 * 
	 * @param synchrnServerVO - ???????? Vo
	 * @return String - ? Url
	 **/
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
	 * ???????????????????????.
	 * 
	 * @param synchrnServerVO - ???????? Vo
	 * @return String - ? Url
	 **/
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
	 * ???????????????????????.
	 * 
	 * @param serverId        - ???????? ID
	 * @param fileNm          - ??????????
	 * @param synchrnServerVO - ???????? Vo
	 * @return String - ? Url
	 **/
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
	 * ????????? ? ??? ????.
	 * 
	 * @param synchrnServer - ???????? model
	 * @return String - ? Url
	 **/
	@RequestMapping(value = "/utl/sys/ssy/addViewSynchrnServer.do")
	public String insertViewSynchrnServer(@ModelAttribute("synchrnServerVO") SynchrnServerVO synchrnServerVO,
			ModelMap model) throws Exception {

		model.addAttribute("synchrnServer", synchrnServerVO);
		return "egovframework/com/utl/sys/ssy/EgovSynchrnServerRegist";
	}

	/**
	 * ????????????????.
	 * 
	 * @param synchrnServer - ???????? model
	 * @return String - ? Url
	 **/
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
			Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated(); // KISA ?????(2018-12-10, ????)

			if (!isAuthenticated) {
				return "redirect:/uat/uia/egovLoginUsr.do";
			}
			synchrnServer.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
			// KISA ?? ??(2018-10-29, ????
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
	 * ???????????????????.
	 * 
	 * @param synchrnServer - ???????? model
	 * @return String - ? Url
	 **/
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
	 * ????????? ? ??? ????.
	 * 
	 * @param synchrnServer - ???????? model
	 * @return String - ? Url
	 **/
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
			Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated(); // KISA ?????(2018-12-10, ????)

			if (!isAuthenticated) {
				return "redirect:/uat/uia/egovLoginUsr.do";
			}
			synchrnServer.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
			// KISA ?? ??(2018-10-29, ????
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
	 * ????????????????????.
	 * 
	 * @param synchrnServer - ???????? model
	 * @return String - ? Url
	 **/
	@RequestMapping(value = "/utl/sys/ssy/removeSynchrnServer.do")
	public String deleteSynchrnServer(@RequestParam("serverId") String serverId,
			@ModelAttribute("synchrnServer") SynchrnServer synchrnServer, Model model) throws Exception {

		synchrnServer.setServerId(serverId);
		egovSynchrnServerService.deleteSynchrnServer(synchrnServer);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/utl/sys/ssy/selectSynchrnServerList.do";
	}

	/**
	 * ??????????????????? ????????????.
	 * 
	 * @param synchrnServerVO - ???????? Vo
	 * @return String - ? Url
	 **/
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
	 * ???????????????????.
	 * 
	 * @param synchrnServerVO - ???????? Vo
	 * @return String - ? Url
	 **/
	@RequestMapping(value = "/utl/sys/ssy/uploadFile.do")
	public String uploadFile(final MultipartHttpServletRequest multiRequest,
		@ModelAttribute("synchrnServer") SynchrnServerVO synchrnServerVO, Model model) throws Exception {

		MultipartFile multipartFile = multiRequest.getFile("file");
		if (multipartFile != null) {//2022.01 Possible null pointer dereference due to return value of called method
			String fileName = multipartFile.getOriginalFilename();
			String extension = EgovFileUploadUtil.getFileExtension(fileName);

			// ?????????
			String whiteListFileUploadExtensions = EgovProperties.getProperty("Globals.fileUpload.Extensions");
			long maxFileSize = Long.parseLong(EgovProperties.getProperty("Globals.fileUpload.maxSize"));
			long fileSize = multipartFile.getSize();

			boolean resultFileExtention = EgovFileUploadUtil.checkFileExtension(fileName,
				whiteListFileUploadExtensions);
			boolean resultFileMaxSize = EgovFileUploadUtil.checkFileMaxSize(multipartFile, maxFileSize);

			if (resultFileExtention && resultFileMaxSize) { // true = ??
				egovSynchrnServerService.writeFile(multipartFile, fileName, synchrnServerVO);
			} else {
				if (!resultFileExtention) {
					model.addAttribute("fileUploadResultMessage", "* ??      ??? ??       ?         ????      ??[" + extension + "]");
				}
				if (!resultFileMaxSize) {
					model.addAttribute("fileUploadResultMessage",
						"* ??      ??? ??       ???    ???      ???      ??[" + fileName + " : " + fileSize + " bytes / " + maxFileSize + " bytes]");
				}
			}

		}

		return "forward:/utl/sys/ssy/selectSynchrnServerList.do";
	}

	/**
	 * ??????????????.
	 * 
	 * @param deleteFiles - ??????? ?
	 * @return String - ? Url
	 **/
	@RequestMapping(value = "/utl/sys/ssy/deleteFile.do")
	public String deleteFile(@RequestParam("deleteFiles") String deleteFiles,
		@ModelAttribute("synchrnServerVO") SynchrnServerVO synchrnServerVO) throws Exception {

		synchrnServerVO.setReflctAt("");
		egovSynchrnServerService.deleteFile(deleteFiles, synchrnServerVO);

		return "forward:/utl/sys/ssy/selectSynchrnServerList.do";
	}

}
