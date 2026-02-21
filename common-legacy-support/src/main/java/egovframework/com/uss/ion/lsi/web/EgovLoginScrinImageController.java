/**
 * ??
 * - ?????????????controller ?????? ???.
 *
 * ???
 * - ??????????????, ??, ???? ?????????.
 * - ???????????? ?, ??????.
 * @author lee.m.j
 * @version 1.0
 * @created 03-8-2009 ?? 2:08:02
 * <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????         ????
 *  -------    --------    ---------------------------
 *  2010.8.3	lee.m.j          ????
 *  2011.8.26	???		IncludedInfo annotation ??
 *
 *  </pre>
 **/

package egovframework.com.uss.ion.lsi.web;

import java.util.Iterator;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
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
import egovframework.com.cmm.service.EgovFileMngService;
import egovframework.com.cmm.service.EgovFileMngUtil;
import egovframework.com.cmm.service.FileVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.ion.lsi.service.EgovLoginScrinImageService;
import egovframework.com.uss.ion.lsi.service.LoginScrinImage;
import egovframework.com.uss.ion.lsi.service.LoginScrinImageVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

@Controller
public class EgovLoginScrinImageController {

	@Resource(name="egovMessageSource")
    EgovMessageSource egovMessageSource;

    @Resource(name="EgovFileMngService")
    private EgovFileMngService fileMngService;

    @Resource(name="EgovFileMngUtil")
    private EgovFileMngUtil fileUtil;

    /** Message ID Generation **/
    @Resource(name="egovLoginScrinImageIdGnrService")
    private EgovIdGnrService egovLoginScrinImageIdGnrService;

    @Resource(name = "egovLoginScrinImageService")
    private EgovLoginScrinImageService egovLoginScrinImageService;

    /**
	 * ???? ? ???
	 * @return String
	 * @exception Exception
	 **/
    @RequestMapping("/uss/ion/lsi/selectLoginScrinImageListView.do")
    public String selectLoginScrinImageListView() throws Exception {

        return "egovframework/com/uss/ion/lsi/EgovLoginScrinImageList";
    }

	/**
	 * ??????????? ??????? ?????.
	 * @param loginScrinImageVO - ???? VO
	 * @return String - ? Url
	 **/
@IncludedInfo(name="Dummy", listUrl="", order=1, gid=50)
    @RequestMapping(value="/uss/ion/lsi/selectLoginScrinImageList.do")
	public String selectLoginScrinImageList(@ModelAttribute("loginScrinImageVO") LoginScrinImageVO loginScrinImageVO,
			                                 ModelMap model) throws Exception {

    	/** paging **/
    	PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(loginScrinImageVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(loginScrinImageVO.getPageUnit());
		paginationInfo.setPageSize(loginScrinImageVO.getPageSize());

		loginScrinImageVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		loginScrinImageVO.setLastIndex(paginationInfo.getLastRecordIndex());
		loginScrinImageVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		loginScrinImageVO.setLoginScrinImageList(egovLoginScrinImageService.selectLoginScrinImageList(loginScrinImageVO));

		model.addAttribute("loginScrinImageList", loginScrinImageVO.getLoginScrinImageList());


        int totCnt = egovLoginScrinImageService.selectLoginScrinImageListTotCnt(loginScrinImageVO);
		paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);

        model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

        return "egovframework/com/uss/ion/lsi/EgovLoginScrinImageList";
	}

	/**
	 * ????????????????.
	 * @param loginScrinImageVO - ???? VO
	 * @return String - ? Url
	 **/
    @RequestMapping(value="/uss/ion/lsi/getLoginScrinImage.do")
	public String selectLoginScrinImage(@RequestParam("imageId") String imageId,
			                            @ModelAttribute("loginScrinImageVO") LoginScrinImageVO loginScrinImageVO,
			                            ModelMap model) throws Exception {
    	loginScrinImageVO.setImageId(imageId);

    	model.addAttribute("loginScrinImage", egovLoginScrinImageService.selectLoginScrinImage(loginScrinImageVO));
    	model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));
    	return "egovframework/com/uss/ion/lsi/EgovLoginScrinImageUpdt";
	}

	/**
	 * ???? ? ??? ????.
	 * @return String - ? Url
	 **/
    @RequestMapping(value="/uss/ion/lsi/addViewLoginScrinImage.do")
	public String insertViewLoginScrinImage(@ModelAttribute("loginScrinImageVO") LoginScrinImageVO loginScrinImageVO) throws Exception {
    	return "egovframework/com/uss/ion/lsi/EgovLoginScrinImageRegist";
	}

	/**
	 * ????????????.
	 * @param loginScrinImage - ???? model
	 * @return String - ? Url
	 **/
    @SuppressWarnings("unused")
	@RequestMapping(value="/uss/ion/lsi/addLoginScrinImage.do")
	public String insertLoginScrinImage(final MultipartHttpServletRequest multiRequest,
			                            @Valid @ModelAttribute("loginScrinImage") LoginScrinImage loginScrinImage,
			                            @ModelAttribute("loginScrinImageVO") LoginScrinImageVO loginScrinImageVO,
			                            BindingResult bindingResult,
			                            SessionStatus status,
						                ModelMap model) throws Exception {

    	if (bindingResult.hasErrors()) {
    		model.addAttribute("loginScrinImageVO", loginScrinImageVO);
			return "egovframework/com/uss/ion/lsi/EgovLoginScrinImageRegist";
		} else {

	    	List<FileVO> result = null;

	    	String uploadFolder = "";
	    	String image = "";
	    	String imageFile = "";
	    	String atchFileId = "";

	    	final Map<String, MultipartFile> files = multiRequest.getFileMap();

	    	if(!files.isEmpty()){
	    	    result = fileUtil.parseFileInf(files, "LSI_", 0, "", uploadFolder);
	    	    atchFileId = fileMngService.insertFileInfs(result);

	        	FileVO vo = result.get(0);
	        	Iterator<FileVO> iter = result.iterator();

	        	while (iter.hasNext()) {
	        	    vo = iter.next();
	        	    image = vo.getOrignlFileNm();
	        	    imageFile = vo.getStreFileNm();
	        	}
	    	}

	    	LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

	    	loginScrinImage.setImageId(egovLoginScrinImageIdGnrService.getNextStringId());
	    	loginScrinImage.setImage(image);
	    	loginScrinImage.setImageFile(atchFileId);
	    	loginScrinImage.setUserId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
	    	loginScrinImageVO.setImageId(loginScrinImage.getImageId());

	    	status.setComplete();
	    	model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));
	    	model.addAttribute("loginScrinImage", egovLoginScrinImageService.insertLoginScrinImage(loginScrinImage, loginScrinImageVO));

//	    	return "egovframework/com/uss/ion/lsi/EgovLoginScrinImageUpdt";
	    	return "forward:/uss/ion/lsi/selectLoginScrinImageList.do";

		}
	}

	/**
	 * ???????????????.
	 * @param loginScrinImage - ???? model
	 * @return String - ? Url
	 **/
	@SuppressWarnings("unused")
	@RequestMapping(value="/uss/ion/lsi/updtLoginScrinImage.do")
	public String updateLoginScrinImage(final MultipartHttpServletRequest multiRequest,
			                            @Valid @ModelAttribute("loginScrinImage") LoginScrinImage loginScrinImage,
			                            BindingResult bindingResult,
			                            SessionStatus status,
		                                ModelMap model) throws Exception {

    	if (bindingResult.hasErrors()) {
    		model.addAttribute("loginScrinImageVO", loginScrinImage);
			return "egovframework/com/uss/ion/lsi/EgovLoginScrinImageUpdt";
		} else {

	    	List<FileVO> result = null;

	    	String uploadFolder = "";
	    	String image = "";
	    	String imageFile = "";
	    	String atchFileId = "";

	    	final Map<String, MultipartFile> files = multiRequest.getFileMap();

	    	if(!files.isEmpty()){
	    	    result = fileUtil.parseFileInf(files, "LSI_", 0, "", uploadFolder);
	    	    atchFileId = fileMngService.insertFileInfs(result);

	        	FileVO vo = null;
	        	Iterator<FileVO> iter = result.iterator();

	        	while (iter.hasNext()) {
	        	    vo = iter.next();
	        	    image = vo.getOrignlFileNm();
	        	    imageFile = vo.getStreFileNm();
	        	}

	        	if (vo == null) {
	        		loginScrinImage.setAtchFile(false);
	        	} else {
	        		loginScrinImage.setImage(image);
	        		loginScrinImage.setImageFile(atchFileId);
	        		loginScrinImage.setAtchFile(true);
	        	}
	    	} else {
	    		loginScrinImage.setAtchFile(false);
	    	}

	    	LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
	    	loginScrinImage.setUserId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));

	    	egovLoginScrinImageService.updateLoginScrinImage(loginScrinImage);
//	    	return "forward:/uss/ion/lsi/getLoginScrinImage.do";
	    	return "forward:/uss/ion/lsi/selectLoginScrinImageList.do";

		}
	}

	/**
	 * ????????????????.
	 * @param loginScrinImage - ???? model
	 * @return String - ? Url
	 **/
    @RequestMapping(value="/uss/ion/lsi/removeLoginScrinImage.do")
	public String deleteLoginScrinImage(@RequestParam("imageId") String imageId,
			                            @ModelAttribute("loginScrinImage") LoginScrinImage loginScrinImage,
			                             SessionStatus status,
			                             ModelMap model) throws Exception {

    	loginScrinImage.setImageId(imageId);
    	egovLoginScrinImageService.deleteLoginScrinImage(loginScrinImage);
    	status.setComplete();
    	model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
    	return "forward:/uss/ion/lsi/selectLoginScrinImageList.do";
	}


	/**
	 * ????????? ???? ?????.
	 * @param loginScrinImageIds String
	 * @param loginScrinImage LoginScrinImage
	 * @return String
	 * @exception Exception
	 **/
    @RequestMapping(value="/uss/ion/lsi/removeLoginScrinImageList.do")
	public String deleteLoginScrinImageList(@RequestParam("imageIds") String imageIds,
			                                @ModelAttribute("loginScrinImage") LoginScrinImage loginScrinImage,
			                                 SessionStatus status,
			                                 ModelMap model) throws Exception {

    	String [] strImageIds = imageIds.split(";");

    	for (String strImageId : strImageIds) {
    		loginScrinImage.setImageId(strImageId);
    		egovLoginScrinImageService.deleteLoginScrinImage(loginScrinImage);
    	}

    	status.setComplete();
    	model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
    	return "forward:/uss/ion/lsi/selectLoginScrinImageList.do";
	}

	/**
	 * ????????????????????????.
	 * @param loginScrinImage - ???? model
	 * @return String - ? Url
	 **/
	public String deleteLoginScrinImageFile(LoginScrinImage loginScrinImage){
		return "";
	}

	/**
	 * ???? ?????????????.
	 * @param loginScrinImageVO - ???? VO
	 * @return String - ? Url
	 **/
	@RequestMapping(value="/uss/ion/lsi/getLoginScrinImageResult.do")
	public String selectLoginScrinImageResult(@ModelAttribute("loginScrinImageVO") LoginScrinImageVO loginScrinImageVO,
			                                   ModelMap model) throws Exception {

		List<LoginScrinImageVO> fileList = egovLoginScrinImageService.selectLoginScrinImageResult(loginScrinImageVO);
		model.addAttribute("fileList", fileList);

		return "egovframework/com/uss/ion/lsi/EgovLoginScrinImageView";
	}
}
