**
 * 媛쒖슂
 * - 硫붿씤?붾㈃?대?吏?????Service Interface瑜??뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - 硫붿씤?붾㈃?대?吏??????깅줉, ?섏젙, ??젣, 議고쉶, 諛섏쁺?뺤씤 湲곕뒫???쒓났?쒕떎.
 * - 硫붿씤?붾㈃?대?吏??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?대Ц以
 * @version 1.0
 * @created 03-8-2009 ?ㅽ썑 2:08:58
 */

package egovframework.com.uss.ion.msi.service;

import java.util.List;

public interface EgovMainImageService {

	/**
	 * 硫붿씤?붾㈃?대?吏?뺣낫瑜?愿由ы븯湲??꾪빐 ?깅줉??硫붿씤?붾㈃?대?吏 紐⑸줉??議고쉶?쒕떎.
	 * @param mainImageVO - 硫붿씤?대?吏 VO
	 * @return List - 硫붿씤?대?吏 紐⑸줉
	 */
	public List<MainImageVO> selectMainImageList(MainImageVO mainImageVO) throws Exception;

	/**
	 * 硫붿씤?붾㈃?대?吏紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param mainImageVO - 硫붿씤?대?吏 VO
	 * @return int - 硫붿씤?대?吏 移댁슫????
	 */
	public int selectLoginScrinImageListTotCnt(MainImageVO mainImageVO) throws Exception;
	
	/**
	 * ?깅줉??硫붿씤?붾㈃?대?吏???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param mainImageVO - 硫붿씤?대?吏 VO
	 * @return MainImageVO - 硫붿씤?대?吏 VO
	 */
	public MainImageVO selectMainImage(MainImageVO mainImageVO) throws Exception;

	/**
	 * 硫붿씤?붾㈃?대?吏?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param mainImage - 硫붿씤?대?吏 model
	 * @param mainImageVO - 硫붿씤?대?吏 VO
	 */
	public MainImageVO insertMainImage(MainImage mainImage,MainImageVO mainImageVO) throws Exception;

	/**
	 * 湲??깅줉??硫붿씤?붾㈃?대?吏?뺣낫瑜??섏젙?쒕떎.
	 * @param mainImage - 硫붿씤?대?吏 model
	 */
	public void updateMainImage(MainImage mainImage) throws Exception;

	/**
	 * 湲??깅줉??硫붿씤?붾㈃?대?吏?뺣낫瑜???젣?쒕떎.
	 * @param mainImage - 硫붿씤?대?吏 model
	 */
	public void deleteMainImage(MainImage mainImage) throws Exception;

	/**
	 * 湲??깅줉??硫붿씤?붾㈃?대?吏?뺣낫???대?吏?뚯씪????젣?쒕떎.
	 * @param mainImage - 硫붿씤?대?吏 model
	 */
	public void deleteMainImageFile(MainImage mainImage) throws Exception;

	/**
	 * 硫붿씤?붾㈃?대?吏媛 ?뱀젙?붾㈃??諛섏쁺??寃곌낵瑜?議고쉶?쒕떎.
	 * @param mainImageVO - 硫붿씤?대?吏 VO
	 * @return List - 硫붿씤?대?吏 紐⑸줉
	 */
	public List<MainImageVO> selectMainImageResult(MainImageVO mainImageVO) throws Exception;

}
