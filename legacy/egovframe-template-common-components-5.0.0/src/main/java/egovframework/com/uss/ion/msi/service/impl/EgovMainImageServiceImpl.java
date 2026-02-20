/**
 * 媛쒖슂
 * - 硫붿씤?붾㈃?대?吏?????ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 硫붿씤?붾㈃?대?吏??????깅줉, ?섏젙, ??젣, 議고쉶, 諛섏쁺?뺤씤 湲곕뒫???쒓났?쒕떎.
 * - 硫붿씤?붾㈃?대?吏??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?대Ц以
 * @version 1.0
 * @created 03-8-2009 ?ㅽ썑 2:08:58
 *
 * ?섏젙
 * 2017.02.08 	?댁젙? 	?쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
 */

package egovframework.com.uss.ion.msi.service.impl;

import java.io.File;
import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import egovframework.com.cmm.service.FileVO;
import egovframework.com.uss.ion.msi.service.EgovMainImageService;
import egovframework.com.uss.ion.msi.service.MainImage;
import egovframework.com.uss.ion.msi.service.MainImageVO;
import jakarta.annotation.Resource;

@Service("egovMainImageService")
public class EgovMainImageServiceImpl extends EgovAbstractServiceImpl implements EgovMainImageService {
	private static final Logger LOGGER = LoggerFactory.getLogger(EgovMainImageServiceImpl.class);

	@Resource(name="mainImageDAO")
    private MainImageDAO mainImageDAO;

	/**
	 * 硫붿씤?붾㈃?대?吏?뺣낫瑜?愿由ы븯湲??꾪빐 ?깅줉??硫붿씤?붾㈃?대?吏 紐⑸줉??議고쉶?쒕떎.
	 * @param mainImageVO - 硫붿씤?대?吏 VO
	 * @return List - 硫붿씤?대?吏 紐⑸줉
	 */
	@Override
	public List<MainImageVO> selectMainImageList(MainImageVO mainImageVO) throws Exception {
		return mainImageDAO.selectMainImageList(mainImageVO);
	}

	/**
	 * 硫붿씤?붾㈃?대?吏紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param mainImageVO - 硫붿씤?대?吏 VO
	 * @return int - 硫붿씤?대?吏 移댁슫????
	 */
	@Override
	public int selectLoginScrinImageListTotCnt(MainImageVO mainImageVO) throws Exception {
		return mainImageDAO.selectMainImageListTotCnt(mainImageVO);
	}

	/**
	 * ?깅줉??硫붿씤?붾㈃?대?吏???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param mainImageVO - 硫붿씤?대?吏 VO
	 * @return MainImageVO - 硫붿씤?대?吏 VO
	 */
	@Override
	public MainImageVO selectMainImage(MainImageVO mainImageVO) throws Exception {
		return mainImageDAO.selectMainImage(mainImageVO);
	}

	/**
	 * 硫붿씤?붾㈃?대?吏?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param mainImage - 硫붿씤?대?吏 model
	 */
	@Override
	public MainImageVO insertMainImage(MainImage mainImage,MainImageVO mainImageVO) throws Exception {
		mainImageDAO.insertMainImage(mainImage);
		mainImageVO.setImageId(mainImage.getImageId());
		return selectMainImage(mainImageVO);
	}

	/**
	 * 湲??깅줉??硫붿씤?붾㈃?대?吏?뺣낫瑜??섏젙?쒕떎.
	 * @param mainImage - 硫붿씤?대?吏 model
	 */
	@Override
	public void updateMainImage(MainImage mainImage) throws Exception {
		mainImageDAO.updateMainImage(mainImage);
	}

	/**
	 * 湲??깅줉??硫붿씤?붾㈃?대?吏?뺣낫瑜???젣?쒕떎.
	 * @param mainImage - 硫붿씤?대?吏 model
	 */
	@Override
	public void deleteMainImage(MainImage mainImage) throws Exception {

		deleteMainImageFile(mainImage);
		mainImageDAO.deleteMainImage(mainImage);
	}

	/**
	 * 湲??깅줉??硫붿씤?붾㈃?대?吏?뺣낫???대?吏?뚯씪????젣?쒕떎.
	 * @param mainImage - 硫붿씤?대?吏 model
	 */
	@Override
	public void deleteMainImageFile(MainImage mainImage) throws Exception {
		FileVO fileVO = mainImageDAO.selectMainImageFile(mainImage);
		File file = new File(fileVO.getFileStreCours()+fileVO.getStreFileNm());
		//2017.02.08 	?댁젙? 	?쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
		if(file.delete()){
			LOGGER.debug("[file.delete] file : File Deletion Success");
		}else{
			LOGGER.error("[file.delete] file : File Deletion Fail");
		}
	}

	/**
	 * 硫붿씤?붾㈃?대?吏媛 ?뱀젙?붾㈃??諛섏쁺??寃곌낵瑜?議고쉶?쒕떎.
	 * @param mainImageVO - 硫붿씤?대?吏 VO
	 * @return MainImageVO - 硫붿씤?대?吏 VO
	 */
	@Override
	public List<MainImageVO> selectMainImageResult(MainImageVO mainImageVO) throws Exception {
		return mainImageDAO.selectMainImageResult(mainImageVO);
	}
}
