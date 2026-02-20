/**
 * 媛쒖슂
 * - 諛곕꼫?????controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 諛곕꼫??????깅줉, ?섏젙, ??젣, 議고쉶, 諛섏쁺?뺤씤 湲곕뒫???쒓났?쒕떎.
 * - 諛곕꼫??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author lee.m.j
 * @version 1.0
 * @created 03-8-2009 ?ㅽ썑 2:07:11
 *  * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??         ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *  2009.8.3	lee.m.j          理쒖큹 ?앹꽦
 *  2011.8.26	?뺤쭊??		IncludedInfo annotation 異붽?
 *
 *  </pre>
 */

package egovframework.com.uss.ion.bnr.web;

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
import egovframework.com.uss.ion.bnr.service.Banner;
import egovframework.com.uss.ion.bnr.service.BannerVO;
import egovframework.com.uss.ion.bnr.service.EgovBannerService;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

@Controller
public class EgovBannerController {

    @Resource(name="egovMessageSource")
    EgovMessageSource egovMessageSource;

    @Resource(name="EgovFileMngService")
    private EgovFileMngService fileMngService;

    @Resource(name="EgovFileMngUtil")
    private EgovFileMngUtil fileUtil;

    @Resource(name = "egovBannerService")
    private EgovBannerService egovBannerService;

    /** Message ID Generation */
    @Resource(name="egovBannerIdGnrService")
    private EgovIdGnrService egovBannerIdGnrService;

    /**
	 * 諛곕꼫 紐⑸줉?붾㈃ ?대룞
	 * @return String
	 * @exception Exception
	 */
    @RequestMapping("/uss/ion/bnr/selectBannerListView.do")
    public String selectBannerListView() throws Exception {

        return "egovframework/com/uss/ion/bnr/EgovBannerList";
    }

	/**
	 * 諛곕꼫瑜?愿由ы븯湲??꾪빐 ?깅줉??諛곕꼫紐⑸줉??議고쉶?쒕떎.
	 * @param bannerVO - 諛곕꼫 VO
	 * @return String - 由ы꽩 URL
	 * @throws Exception
	 */
    @IncludedInfo(name="諛곕꼫愿由?, order = 740 ,gid = 50)
    @RequestMapping(value="/uss/ion/bnr/selectBannerList.do")
	public String selectBannerList(@ModelAttribute("bannerVO") BannerVO bannerVO,
                             		ModelMap model) throws Exception{

    	/** paging */
    	PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(bannerVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(bannerVO.getPageUnit());
		paginationInfo.setPageSize(bannerVO.getPageSize());

		bannerVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		bannerVO.setLastIndex(paginationInfo.getLastRecordIndex());
		bannerVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		bannerVO.setBannerList(egovBannerService.selectBannerList(bannerVO));

		model.addAttribute("bannerList", bannerVO.getBannerList());

        int totCnt = egovBannerService.selectBannerListTotCnt(bannerVO);
		paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);

        model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/uss/ion/bnr/EgovBannerList";
	}

	/**
	 * ?깅줉??諛곕꼫???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param bannerVO - 諛곕꼫 Vo
	 * @return String - 由ы꽩 Url
	 */
    @RequestMapping(value="/uss/ion/bnr/getBanner.do")
	public String selectBanner(@RequestParam("bannerId") String bannerId,
			                   @ModelAttribute("bannerVO") BannerVO bannerVO,
			                   ModelMap model) throws Exception {

    	bannerVO.setBannerId(bannerId);

    	model.addAttribute("banner", egovBannerService.selectBanner(bannerVO));
    	model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));
    	return "egovframework/com/uss/ion/bnr/EgovBannerUpdt";
	}

	/**
	 * 諛곕꼫?깅줉 ?붾㈃?쇰줈 ?대룞?쒕떎.
	 * @param banner - 諛곕꼫 model
	 * @return String - 由ы꽩 Url
	 */
    @RequestMapping(value="/uss/ion/bnr/addViewBanner.do")
	public String insertViewBanner(@ModelAttribute("bannerVO") BannerVO bannerVO,
			                        ModelMap model) throws Exception {

    	model.addAttribute("banner", bannerVO);
    	return "egovframework/com/uss/ion/bnr/EgovBannerRegist";
	}

	/**
	 * 諛곕꼫?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param banner - 諛곕꼫 model
	 * @return String - 由ы꽩 Url
	 */
    @SuppressWarnings("unused")
	@RequestMapping(value="/uss/ion/bnr/addBanner.do")
	public String insertBanner(final MultipartHttpServletRequest multiRequest,
			                   @Valid @ModelAttribute("banner") Banner banner,
			                   @ModelAttribute("bannerVO") BannerVO bannerVO,
			                    BindingResult bindingResult,
			                    SessionStatus status,
			                    ModelMap model) throws Exception {

    	if (bindingResult.hasErrors()) {
    		model.addAttribute("bannerVO", bannerVO);
			return "egovframework/com/uss/ion/bnr/EgovBannerRegist";
		} else {
	    	List<FileVO> result = null;

	    	String uploadFolder = "";
	    	String bannerImage = "";
	    	String bannerImageFile = "";
	    	String atchFileId = "";

	    	final Map<String, MultipartFile> files = multiRequest.getFileMap();

	    	if(!files.isEmpty()){
	    	    result = fileUtil.parseFileInf(files, "BNR_", 0, "", uploadFolder);
	    	    atchFileId = fileMngService.insertFileInfs(result);

	        	FileVO vo = result.get(0);
	        	Iterator<FileVO> iter = result.iterator();

	        	while (iter.hasNext()) {
	        	    vo = iter.next();
	        	    bannerImage = vo.getOrignlFileNm();
	        	    bannerImageFile = vo.getStreFileNm();
	        	}
	    	}

	    	LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

	    	banner.setBannerId(egovBannerIdGnrService.getNextStringId());
	    	banner.setBannerImage(bannerImage);
	    	banner.setBannerImageFile(atchFileId);
	    	banner.setUserId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
	    	bannerVO.setBannerId(banner.getBannerId());
	    	status.setComplete();
	    	model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));
	    	model.addAttribute("banner", egovBannerService.insertBanner(banner, bannerVO));

//	    	return "egovframework/com/uss/ion/bnr/EgovBannerUpdt";
			return "forward:/uss/ion/bnr/selectBannerList.do";

		}
	}

	/**
	 * 湲??깅줉??諛곕꼫?뺣낫瑜??섏젙?쒕떎.
	 * @param banner - 諛곕꼫 model
	 * @return String - 由ы꽩 Url
	 */
    @SuppressWarnings("unused")
	@RequestMapping(value="/uss/ion/bnr/updtBanner.do")
	public String updateBanner(final MultipartHttpServletRequest multiRequest,
			                   @Valid @ModelAttribute("banner") Banner banner,
			                    BindingResult bindingResult,
                                SessionStatus status,
                                ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			model.addAttribute("bannerVO", banner);
			return "egovframework/com/uss/ion/bnr/EgovBannerUpdt";
		} else {

			List<FileVO> result = null;

			String uploadFolder = "";
			String bannerImage = "";
			String bannerImageFile = "";
			String atchFileId = "";

			final Map<String, MultipartFile> files = multiRequest.getFileMap();

			if (!files.isEmpty()) {
				result = fileUtil.parseFileInf(files, "BNR_", 0, "", uploadFolder);
				atchFileId = fileMngService.insertFileInfs(result);

				FileVO vo = null;
				Iterator<FileVO> iter = result.iterator();

				while (iter.hasNext()) {
					vo = iter.next();
					bannerImage = vo.getOrignlFileNm();
					bannerImageFile = vo.getStreFileNm();
				}

				if (vo == null) {
					banner.setAtchFile(false);
				} else {
					banner.setBannerImage(bannerImage);
					banner.setBannerImageFile(atchFileId);
					banner.setAtchFile(true);

				}
			} else {
				banner.setAtchFile(false);
			}

			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			banner.setUserId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));


			egovBannerService.updateBanner(banner);
			//	    	return "forward:/uss/ion/bnr/getBanner.do";
			return "forward:/uss/ion/bnr/selectBannerList.do";

		}
	}

	/**
	 * 湲??깅줉??諛곕꼫?뺣낫瑜???젣?쒕떎.
	 * @param banner Banner
	 * @return String
	 * @exception Exception
	 */
    @RequestMapping(value="/uss/ion/bnr/removeBanner.do")
	public String deleteBanner(@RequestParam("bannerId") String bannerId,
			                   @ModelAttribute("banner") Banner banner,
			                    SessionStatus status,
			                    ModelMap model) throws Exception {

    	banner.setBannerId(bannerId);
    	egovBannerService.deleteBanner(banner);
    	status.setComplete();
    	model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/uss/ion/bnr/selectBannerList.do";
	}

	/**
	 * 湲??깅줉??諛곕꼫?뺣낫紐⑸줉???쇨큵 ??젣?쒕떎.
	 * @param banners String
	 * @param banner Banner
	 * @return String
	 * @exception Exception
	 */
    @RequestMapping(value="/uss/ion/bnr/removeBannerList.do")
	public String deleteBannerList(@RequestParam("bannerIds") String bannerIds,
			                       @ModelAttribute("banner") Banner banner,
			                        SessionStatus status,
			                        ModelMap model) throws Exception {

    	String [] strBannerIds = bannerIds.split(";");

    	for (String strBannerId : strBannerIds) {
    		banner.setBannerId(strBannerId);
    		egovBannerService.deleteBanner(banner);
    	}

    	status.setComplete();
    	model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/uss/ion/bnr/selectBannerList.do";
	}

	/**
	 * 諛곕꼫媛 ?뱀젙?붾㈃??諛섏쁺??寃곌낵瑜?議고쉶?쒕떎.
	 * @param bannerVO - 諛곕꼫 VO
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value="/uss/ion/bnr/getBannerImage.do")
	public String selectBannerResult(@ModelAttribute("bannerVO") BannerVO bannerVO,
                                      ModelMap model) throws Exception {

		List<BannerVO> fileList = egovBannerService.selectBannerResult(bannerVO);
		model.addAttribute("fileList", fileList);
		model.addAttribute("resultType", bannerVO.getResultType());

		return "egovframework/com/uss/ion/bnr/EgovBannerView";
	}

	/**
	 * MyPage??諛곕꼫?뺣낫瑜??쒓났?섍린 ?꾪빐 紐⑸줉??議고쉶?쒕떎.
	 * @param bannerVO - 諛곕꼫 VO
	 * @return String - 由ы꽩 URL
	 * @throws Exception
	 */
	@IncludedInfo(name="MYPAGE諛곕꼫愿由?, order = 741 ,gid = 50)
    @RequestMapping(value="/uss/ion/bnr/selectBannerMainList.do")
	public String selectBannerMainList(@ModelAttribute("bannerVO") BannerVO bannerVO,
                             		ModelMap model) throws Exception{

    	/** paging */
    	PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(bannerVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(5);
		paginationInfo.setPageSize(bannerVO.getPageSize());

		bannerVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		bannerVO.setLastIndex(paginationInfo.getLastRecordIndex());
		bannerVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		bannerVO.setBannerList(egovBannerService.selectBannerList(bannerVO));

		model.addAttribute("bannerList", bannerVO.getBannerList());

		return "egovframework/com/uss/ion/bnr/EgovBannerMainList";
	}
}
