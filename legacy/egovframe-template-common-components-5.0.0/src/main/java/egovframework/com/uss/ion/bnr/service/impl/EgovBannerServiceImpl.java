/**
 * 媛쒖슂
 * - 諛곕꼫?????ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 諛곕꼫??????깅줉, ?섏젙, ??젣, 議고쉶, 諛섏쁺?뺤씤 湲곕뒫???쒓났?쒕떎.
 * - 諛곕꼫??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?대Ц以
 * @version 1.0
 * @created 03-8-2009 ?ㅽ썑 2:07:12
 */

package egovframework.com.uss.ion.bnr.service.impl;

import java.io.File;
import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import egovframework.com.cmm.service.FileVO;
import egovframework.com.uss.ion.bnr.service.Banner;
import egovframework.com.uss.ion.bnr.service.BannerVO;
import egovframework.com.uss.ion.bnr.service.EgovBannerService;
import jakarta.annotation.Resource;

@Service("egovBannerService")
public class EgovBannerServiceImpl extends EgovAbstractServiceImpl implements EgovBannerService {

	/** logger */
	private static final Logger LOGGER = LoggerFactory.getLogger(EgovBannerServiceImpl.class);

	@Resource(name="bannerDAO")
    private BannerDAO bannerDAO;

	/**
	 * 諛곕꼫瑜?愿由ы븯湲??꾪빐 ?깅줉??諛곕꼫紐⑸줉??議고쉶?쒕떎.
	 * @param bannerVO - 諛곕꼫 VO
	 * @return List - 諛곕꼫 紐⑸줉
	 */
	@Override
	public List<BannerVO> selectBannerList(BannerVO bannerVO) throws Exception{
		return bannerDAO.selectBannerList(bannerVO);
	}

	/**
	 * 諛곕꼫紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param bannerVO - 諛곕꼫 VO
	 * @return int - 諛곕꼫 移댁슫????
	 */
	@Override
	public int selectBannerListTotCnt(BannerVO bannerVO) throws Exception {
		return bannerDAO.selectBannerListTotCnt(bannerVO);
	}

	/**
	 * ?깅줉??諛곕꼫???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param bannerVO - 諛곕꼫 VO
	 * @return BannerVO - 諛곕꼫 VO
	 */
	@Override
	public BannerVO selectBanner(BannerVO bannerVO) throws Exception{
		return bannerDAO.selectBanner(bannerVO);
	}

	/**
	 * 諛곕꼫?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param banner - 諛곕꼫 model
	 */
	@Override
	public BannerVO insertBanner(Banner banner, BannerVO bannerVO) throws Exception{
        bannerDAO.insertBanner(banner);
        bannerVO.setBannerId(banner.getBannerId());
        return selectBanner(bannerVO);
	}

	/**
	 * 湲??깅줉??諛곕꼫?뺣낫瑜??섏젙?쒕떎.
	 * @param banner - 諛곕꼫 model
	 */
	@Override
	public void updateBanner(Banner banner) throws Exception{
        bannerDAO.updateBanner(banner);
	}

	/**
	 * 湲??깅줉??諛곕꼫?뺣낫瑜???젣?쒕떎.
	 * @param banner - 諛곕꼫 model
	 */
	@Override
	public void deleteBanner(Banner banner) throws Exception {
		deleteBannerFile(banner);
        bannerDAO.deleteBanner(banner);
	}

	/**
	 * 湲??깅줉??諛곕꼫?뺣낫???대?吏?뚯씪????젣?쒕떎.
	 * @param banner - 諛곕꼫 model
	 */
	@Override
	public void deleteBannerFile(Banner banner) throws Exception{
		FileVO fileVO = bannerDAO.selectBannerFile(banner);
		File file = new File(fileVO.getFileStreCours()+fileVO.getStreFileNm());
		//2017.02.08 	?댁젙? 	?쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
		if(file.delete()){
			LOGGER.debug("[file.delete] file : File Deletion Success");
		}else{
			LOGGER.error("[file.delete] file : File Deletion Fail");
		}
	}

	/**
	 * 諛곕꼫媛 ?뱀젙?붾㈃??諛섏쁺??寃곌낵瑜?議고쉶?쒕떎.
	 * @param bannerVO - 諛곕꼫 VO
	 * @return BannerVO - 諛곕꼫 VO
	 */
	@Override
	public List<BannerVO> selectBannerResult(BannerVO bannerVO) throws Exception{
		return bannerDAO.selectBannerResult(bannerVO);
	}

}