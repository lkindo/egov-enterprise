**
 * 媛쒖슂
 * - 硫붿씤?붾㈃?대?吏?????controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 硫붿씤?붾㈃?대?吏??????깅줉, ?섏젙, ??젣, 議고쉶, 諛섏쁺?뺤씤 湲곕뒫???쒓났?쒕떎.
 * - 硫붿씤?붾㈃?대?吏??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?대Ц以
 * @version 1.0
 * @created 03-8-2009 ?ㅽ썑 2:08:57
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??         ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *  2010.8.3	?대Ц以          理쒖큹 ?앹꽦
 *  2011.8.26	?뺤쭊??		IncludedInfo annotation 異붽?
 *
 *  </pre>
 */

package egovframework.com.uss.ion.msi.web;

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
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.EgovFileMngService;
import egovframework.com.cmm.service.EgovFileMngUtil;
import egovframework.com.cmm.service.FileVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.ion.msi.service.EgovMainImageService;
import egovframework.com.uss.ion.msi.service.MainImage;
import egovframework.com.uss.ion.msi.service.MainImageVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

@Controller
public class EgovMainImageController {

	@Resource(name="egovMessageSource")
    EgovMessageSource egovMessageSource;

    @Resource(name="EgovFileMngService")
    private EgovFileMngService fileMngService;

    @Resource(name="EgovFileMngUtil")
    private EgovFileMngUtil fileUtil;

    /** Message ID Generation */
    @Resource(name="egovMainImageIdGnrService")
    private EgovIdGnrService egovMainImageIdGnrService;

    @Resource(name = "egovMainImageService")
    private EgovMainImageService egovMainImageService;

    /**
	 * 硫붿씤?붾㈃?대?吏 紐⑸줉?붾㈃ ?대룞
	 * @return String
	 * @exception Exception
	 */
    @RequestMapping("/uss/ion/msi/selectMainImageListView.do")
    public String selectMainImageListView() throws Exception {

        return "egovframework/com/uss/ion/msi/EgovMainImageList";
    }

	/**
	 * 硫붿씤?붾㈃?대?吏?뺣낫瑜?愿由ы븯湲??꾪빐 ?깅줉??硫붿씤?붾㈃?대?吏 紐⑸줉??議고쉶?쒕떎.
	 * @param mainImageVO - 硫붿씤?대?吏 VO
	 * @return String - 由ы꽩 Url
	 */
    @IncludedInfo(name="硫붿씤?대?吏愿由?, order = 770 ,gid = 50)
    @RequestMapping("/uss/ion/msi/selectMainImageList.do")
	public String selectMainImageList(@ModelAttribute("mainImageVO") MainImageVO mainImageVO,
                                       ModelMap model) throws Exception {

    	/** paging */
    	PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(mainImageVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(mainImageVO.getPageUnit());
		paginationInfo.setPageSize(mainImageVO.getPageSize());

		mainImageVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		mainImageVO.setLastIndex(paginationInfo.getLastRecordIndex());
		mainImageVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		mainImageVO.setMainImageList(egovMainImageService.selectMainImageList(mainImageVO));

		model.addAttribute("mainImageList", mainImageVO.getMainImageList());

        int totCnt = egovMainImageService.selectLoginScrinImageListTotCnt(mainImageVO);
		paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);

        model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

        return "egovframework/com/uss/ion/msi/EgovMainImageList";
	}

	/**
	 * ?깅줉??硫붿씤?붾㈃?대?吏???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param mainImageVO - 硫붿씤?대?吏 VO
	 * @return String - 由ы꽩 Url
	 */
    @RequestMapping(value="/uss/ion/msi/getMainImage.do")
	public String selectMainImage(@RequestParam("imageId") String imageId,
                                  @ModelAttribute("mainImageVO") MainImageVO mainImageVO,
                                   ModelMap model) throws Exception {

    	mainImageVO.setImageId(imageId);
    	model.addAttribute("mainImage", egovMainImageService.selectMainImage(mainImageVO));
    	model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

    	return "egovframework/com/uss/ion/msi/EgovMainImageUpdt";
	}

	/**
	 * 硫붿씤?명솕硫댁씠誘몄? ?깅줉 ?붾㈃?쇰줈 ?대룞?쒕떎.
	 * @return String - 由ы꽩 Url
	 */
    @RequestMapping(value="/uss/ion/msi/addViewMainImage.do")
	public String insertViewMainImage(@ModelAttribute("mainImageVO") MainImageVO mainImageVO) throws Exception {
    	return "egovframework/com/uss/ion/msi/EgovMainImageRegist";
	}

	/**
	 * 硫붿씤?붾㈃?대?吏?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param mainImage - 硫붿씤?대?吏 model
	 * @return String - 由ы꽩 Url
	 */
    @SuppressWarnings("unused")
	@RequestMapping(value="/uss/ion/msi/addMainImage.do")
	public String insertMainImage(final MultipartHttpServletRequest multiRequest,
			                      @Valid @ModelAttribute("mainImage") MainImage mainImage,
			                      @ModelAttribute("mainImageVO") MainImageVO mainImageVO,
			                       BindingResult bindingResult,
			                       ModelMap model) throws Exception {

    	if (bindingResult.hasErrors()) {
    		model.addAttribute("mainImageVO", mainImageVO);
			return "egovframework/com/uss/ion/msi/EgovMainImageRegist";
		} else {

	    	List<FileVO> result = null;

	    	String uploadFolder = "";
	    	String image = "";
	    	String imageFile = "";
	    	String atchFileId = "";

	    	final Map<String, MultipartFile> files = multiRequest.getFileMap();

	    	if(!files.isEmpty()){
	    	    result = fileUtil.parseFileInf(files, "MSI_", 0, "", uploadFolder);
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

	    	mainImage.setImageId(egovMainImageIdGnrService.getNextStringId());
	    	mainImage.setImage(image);
	    	mainImage.setImageFile(atchFileId);
	    	mainImage.setImageId(mainImage.getImageId());
	    	mainImage.setUserId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));

	    	model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));
	    	model.addAttribute("mainImage", egovMainImageService.insertMainImage(mainImage, mainImageVO));

//			return "egovframework/com/uss/ion/msi/EgovMainImageUpdt";
			return "forward:/uss/ion/msi/selectMainImageList.do";

		}
	}

	/**
	 * 湲??깅줉??硫붿씤?붾㈃?대?吏?뺣낫瑜??섏젙?쒕떎.
	 * @param mainImage - 硫붿씤?대?吏 model
	 * @return String - 由ы꽩 Url
	 */
    @SuppressWarnings("unused")
	@RequestMapping(value="/uss/ion/msi/updtMainImage.do")
	public String updateMainImage(final MultipartHttpServletRequest multiRequest,
                                  @Valid @ModelAttribute("mainImage") MainImage mainImage,
                                   BindingResult bindingResult,
                                   ModelMap model) throws Exception {

    	if (bindingResult.hasErrors()) {
    		model.addAttribute("mainImageVO", mainImage);
			return "egovframework/com/uss/ion/msi/EgovMainImageUpdt";
		} else {

	    	List<FileVO> result = null;

	    	String uploadFolder = "";
	    	String image = "";
	    	String imageFile = "";
	    	String atchFileId = "";

	    	final Map<String, MultipartFile> files = multiRequest.getFileMap();

	    	if(!files.isEmpty()){
	    	    result = fileUtil.parseFileInf(files, "MSI_", 0, "", uploadFolder);
	    	    atchFileId = fileMngService.insertFileInfs(result);

	        	FileVO vo = null;
	        	Iterator<FileVO> iter = result.iterator();

	        	while (iter.hasNext()) {
	        	    vo = iter.next();
	        	    image = vo.getOrignlFileNm();
	        	    imageFile = vo.getStreFileNm();
	        	}

	        	if (vo == null) {
	        		mainImage.setAtchFile(false);
	        	} else {
	        		mainImage.setImage(image);
	        		mainImage.setImageFile(atchFileId);
	        		mainImage.setAtchFile(true);
	        	}
	    	} else {
	    		mainImage.setAtchFile(false);
	    	}

	    	LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
	    	mainImage.setUserId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));

	    	egovMainImageService.updateMainImage(mainImage);
//	    	return "forward:/uss/ion/msi/getMainImage.do";
	    	return "forward:/uss/ion/msi/selectMainImageList.do";
		}
    }

	/**
	 * 湲??깅줉??硫붿씤?붾㈃?대?吏?뺣낫瑜???젣?쒕떎.
	 * @param mainImage - 硫붿씤?대?吏 model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value="/uss/ion/msi/removeMainImage.do")
	public String deleteMainImage(@RequestParam("imageId") String imageId,
                                  @ModelAttribute("mainImage") MainImage mainImage,
  			                       ModelMap model) throws Exception {

		mainImage.setImageId(imageId);
		egovMainImageService.deleteMainImage(mainImage);
    	model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/uss/ion/msi/selectMainImageList.do";
	}

	/**
	 * 湲??깅줉??硫붿씤?붾㈃?대?吏?뺣낫瑜???젣?쒕떎.
	 * @param mainImage - 硫붿씤?대?吏 model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value="/uss/ion/msi/removeMainImageList.do")
	public String deleteMainImageList(@RequestParam("imageIds") String imageIds,
                                      @ModelAttribute("mainImage") MainImage mainImage,
                                       ModelMap model) throws Exception {

    	String [] strImageIds = imageIds.split(";");

    	for (String strImageId : strImageIds) {
    		mainImage.setImageId(strImageId);
    		egovMainImageService.deleteMainImage(mainImage);
    	}

    	model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
    	return "forward:/uss/ion/msi/selectMainImageList.do";
	}

	/**
	 * 湲??깅줉??硫붿씤?붾㈃?대?吏?뺣낫???대?吏?뚯씪????젣?쒕떎.
	 * @param mainImage - 硫붿씤?대?吏 model
	 * @return String - 由ы꽩 Url
	 */
	public String deleteMainImageFile(MainImage mainImage) throws Exception {
		return "";
	}

	/**
	 * 硫붿씤?붾㈃?대?吏媛 ?뱀젙?붾㈃??諛섏쁺??寃곌낵瑜?議고쉶?쒕떎.
	 * @param mainImageVO - 硫붿씤?대?吏 VO
	 * @return String - 由ы꽩 Url
	 */
	@IncludedInfo(name="硫붿씤?대?吏 諛섏쁺寃곌낵蹂닿린", order = 771 ,gid = 50)
	@RequestMapping(value="/uss/ion/msi/getMainImageResult.do")
	public String selectMainImageResult(@ModelAttribute("mainImageVO") MainImageVO mainImageVO,
		                                 ModelMap model) throws Exception {

		List<MainImageVO> fileList = egovMainImageService.selectMainImageResult(mainImageVO);
		model.addAttribute("fileList", fileList);

		return "egovframework/com/uss/ion/msi/EgovMainImageView";
	}
}
