/**
 * 媛쒖슂
 * - ?명꽣?룹꽌鍮꾩뒪?덈궡?????controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?명꽣?룹꽌鍮꾩뒪?덈궡??????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - ?명꽣?룹꽌鍮꾩뒪?덈궡??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author lee.m.j
 * @version 1.0
 * @created 03-8-2009 ?ㅽ썑 2:08:02
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??         ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *  2010.8.3	lee.m.j          理쒖큹 ?앹꽦
 *  2011.8.26	?뺤쭊??		IncludedInfo annotation 異붽?
 *
 *  </pre>
 */

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

    /** Message ID Generation */
    @Resource(name="egovLoginScrinImageIdGnrService")
    private EgovIdGnrService egovLoginScrinImageIdGnrService;

    @Resource(name = "egovLoginScrinImageService")
    private EgovLoginScrinImageService egovLoginScrinImageService;

    /**
	 * 濡쒓렇?명솕硫댁씠誘몄? 紐⑸줉?붾㈃ ?대룞
	 * @return String
	 * @exception Exception
	 */
    @RequestMapping("/uss/ion/lsi/selectLoginScrinImageListView.do")
    public String selectLoginScrinImageListView() throws Exception {

        return "egovframework/com/uss/ion/lsi/EgovLoginScrinImageList";
    }

	/**
	 * 濡쒓렇?명솕硫댁씠誘몄??뺣낫瑜?愿由ы븯湲??꾪빐 ?깅줉??濡쒓렇?명솕硫댁씠誘몄? 紐⑸줉??議고쉶?쒕떎.
	 * @param loginScrinImageVO - 濡쒓렇?명솕硫댁씠誘몄? VO
	 * @return String - 由ы꽩 Url
	 */
    @IncludedInfo(name="濡쒓렇?명솕硫댁씠誘몄?愿由?, order = 750 ,gid = 50)
    @RequestMapping(value="/uss/ion/lsi/selectLoginScrinImageList.do")
	public String selectLoginScrinImageList(@ModelAttribute("loginScrinImageVO") LoginScrinImageVO loginScrinImageVO,
			                                 ModelMap model) throws Exception {

    	/** paging */
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
	 * ?깅줉??濡쒓렇?명솕硫댁씠誘몄????곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param loginScrinImageVO - 濡쒓렇?명솕硫댁씠誘몄? VO
	 * @return String - 由ы꽩 Url
	 */
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
	 * 濡쒓렇?명솕硫댁씠誘몄? ?깅줉 ?붾㈃?쇰줈 ?대룞?쒕떎.
	 * @return String - 由ы꽩 Url
	 */
    @RequestMapping(value="/uss/ion/lsi/addViewLoginScrinImage.do")
	public String insertViewLoginScrinImage(@ModelAttribute("loginScrinImageVO") LoginScrinImageVO loginScrinImageVO) throws Exception {
    	return "egovframework/com/uss/ion/lsi/EgovLoginScrinImageRegist";
	}

	/**
	 * 濡쒓렇?명솕硫댁씠誘몄??뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param loginScrinImage - 濡쒓렇?명솕硫댁씠誘몄? model
	 * @return String - 由ы꽩 Url
	 */
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
	 * 湲??깅줉??濡쒓렇?명솕硫댁씠誘몄??뺣낫瑜??섏젙?쒕떎.
	 * @param loginScrinImage - 濡쒓렇?명솕硫댁씠誘몄? model
	 * @return String - 由ы꽩 Url
	 */
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
	 * 湲??깅줉??濡쒓렇?명솕硫댁씠誘몄??뺣낫瑜???젣?쒕떎.
	 * @param loginScrinImage - 濡쒓렇?명솕硫댁씠誘몄? model
	 * @return String - 由ы꽩 Url
	 */
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
	 * 湲??깅줉??濡쒓렇?명솕硫댁씠誘몄??뺣낫 紐⑸줉???쇨큵 ??젣?쒕떎.
	 * @param loginScrinImageIds String
	 * @param loginScrinImage LoginScrinImage
	 * @return String
	 * @exception Exception
	 */
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
	 * 湲??깅줉??濡쒓렇?명솕硫댁씠誘몄??뺣낫???대?吏?뚯씪????젣?쒕떎.
	 * @param loginScrinImage - 濡쒓렇?명솕硫댁씠誘몄? model
	 * @return String - 由ы꽩 Url
	 */
	public String deleteLoginScrinImageFile(LoginScrinImage loginScrinImage){
		return "";
	}

	/**
	 * 濡쒓렇?명솕硫댁씠誘몄?媛 ?뱀젙?붾㈃??諛섏쁺??寃곌낵瑜?議고쉶?쒕떎.
	 * @param loginScrinImageVO - 濡쒓렇?명솕硫댁씠誘몄? VO
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value="/uss/ion/lsi/getLoginScrinImageResult.do")
	public String selectLoginScrinImageResult(@ModelAttribute("loginScrinImageVO") LoginScrinImageVO loginScrinImageVO,
			                                   ModelMap model) throws Exception {

		List<LoginScrinImageVO> fileList = egovLoginScrinImageService.selectLoginScrinImageResult(loginScrinImageVO);
		model.addAttribute("fileList", fileList);

		return "egovframework/com/uss/ion/lsi/EgovLoginScrinImageView";
	}
}
