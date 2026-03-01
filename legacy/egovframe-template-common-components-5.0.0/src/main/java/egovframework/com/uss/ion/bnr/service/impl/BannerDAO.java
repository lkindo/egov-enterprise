**
 * 媛쒖슂
 * - 諛곕꼫?????DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - 諛곕꼫??????깅줉, ?섏젙, ??젣, 議고쉶, 諛섏쁺?뺤씤 湲곕뒫???쒓났?쒕떎.
 * - 諛곕꼫??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?대Ц以
 * @version 1.0
 * @created 03-8-2009 ?ㅽ썑 2:07:11
 */

package egovframework.com.uss.ion.bnr.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.FileVO;
import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.uss.ion.bnr.service.Banner;
import egovframework.com.uss.ion.bnr.service.BannerVO;

@Repository("bannerDAO")
public class BannerDAO extends EgovComAbstractDAO {
	
	/**
	 * 諛곕꼫瑜?愿由ы븯湲??꾪빐 ?깅줉??諛곕꼫紐⑸줉??議고쉶?쒕떎.
	 * @param bannerVO - 諛곕꼫 Vo
	 * @return List - 諛곕꼫 紐⑸줉
	 * @exception Exception
	 */	
	public List<BannerVO> selectBannerList(BannerVO bannerVO) throws Exception {
		return selectList("bannerDAO.selectBannerList", bannerVO);
	}

    /**
	 * 諛곕꼫紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param bannerVO BannerVO
	 * @return int
	 * @exception Exception
	 */
    public int selectBannerListTotCnt(BannerVO bannerVO) throws Exception {
        return (Integer)selectOne("bannerDAO.selectBannerListTotCnt", bannerVO);
    }

	/**
	 * ?깅줉??諛곕꼫???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param bannerVO - 諛곕꼫 Vo
	 * @return BannerVO - 諛곕꼫 Vo
	 * 
	 * @param bannerVO
	 */
	public BannerVO selectBanner(BannerVO bannerVO) throws Exception {
		return (BannerVO) selectOne("bannerDAO.selectBanner", bannerVO);
	}

	/**
	 * 諛곕꼫?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param banner - 諛곕꼫 model
	 */
	public void insertBanner(Banner banner) throws Exception {
		insert("bannerDAO.insertBanner", banner);
	}

	/**
	 * 湲??깅줉??諛곕꼫?뺣낫瑜??섏젙?쒕떎.
	 * @param banner - 諛곕꼫 model
	 */
	public void updateBanner(Banner banner) throws Exception {
        update("bannerDAO.updateBanner", banner);
	}

	/**
	 * 湲??깅줉??諛곕꼫?뺣낫瑜???젣?쒕떎.
	 * @param banner - 諛곕꼫 model
	 * 
	 * @param banner
	 */
	public void deleteBanner(Banner banner) throws Exception {
		delete("bannerDAO.deleteBanner", banner);
	}

	/**
	 * 湲??깅줉??諛곕꼫?뺣낫???대?吏?뚯씪????젣?섍린 ?꾪빐 ?뚯씪?뺣낫瑜?議고쉶?쒕떎.
	 * @param banner - 諛곕꼫 model
	 * @return FileVO - ?뚯씪 VO
	 */
	public FileVO selectBannerFile(Banner banner) throws Exception {
		return (FileVO) selectOne("bannerDAO.selectBannerFile", banner);
	}

	/**
	 * 諛곕꼫媛 ?뱀젙?붾㈃??諛섏쁺??寃곌낵瑜?議고쉶?쒕떎.
	 * @param bannerVO - 諛곕꼫 VO
	 * @return BannerVO - 諛곕꼫 VO
	 * @exception Exception
	 */
	
	public List<BannerVO> selectBannerResult(BannerVO bannerVO) throws Exception {
		return selectList("bannerDAO.selectBannerResult", bannerVO);
	}

}
