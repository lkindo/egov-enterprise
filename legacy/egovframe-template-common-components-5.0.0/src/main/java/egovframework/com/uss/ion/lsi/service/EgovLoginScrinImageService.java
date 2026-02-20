
/**
 * 媛쒖슂
 * - 濡쒓렇?명솕硫댁씠誘몄??????Service Interface瑜??뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - 濡쒓렇?명솕硫댁씠誘몄???????깅줉, ?섏젙, ??젣, 議고쉶, 諛섏쁺?뺤씤 湲곕뒫???쒓났?쒕떎.
 * - 濡쒓렇?명솕硫댁씠誘몄???議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?대Ц以
 * @version 1.0
 * @created 03-8-2009 ?ㅽ썑 2:08:56
 */

package egovframework.com.uss.ion.lsi.service;

import java.util.List;

public interface EgovLoginScrinImageService {

	/**
	 * 濡쒓렇?명솕硫댁씠誘몄??뺣낫瑜?愿由ы븯湲??꾪빐 ?깅줉??濡쒓렇?명솕硫댁씠誘몄? 紐⑸줉??議고쉶?쒕떎.
	 * @param loginScrinImageVO - 濡쒓렇?명솕硫댁씠誘몄? VO
	 * @return List - 濡쒓렇?명솕硫댁씠誘몄? 紐⑸줉
	 */
	public List<LoginScrinImageVO> selectLoginScrinImageList(LoginScrinImageVO loginScrinImageVO) throws Exception;

	/**
	 * 濡쒓렇?명솕硫댁씠誘몄?紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param loginScrinImageVO - 濡쒓렇?명솕硫댁씠誘몄? VO
	 * @return int - 濡쒓렇?명솕硫댁씠誘몄? 移댁슫????
	 */
	public int selectLoginScrinImageListTotCnt(LoginScrinImageVO loginScrinImageVO) throws Exception ;
	
	/**
	 * ?깅줉??濡쒓렇?명솕硫댁씠誘몄????곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param loginScrinImageVO - 濡쒓렇?명솕硫댁씠誘몄? VO
	 * @return LoginScrinImageVO - 濡쒓렇?명솕硫댁씠誘몄? VO
	 */
	public LoginScrinImageVO selectLoginScrinImage(LoginScrinImageVO loginScrinImageVO) throws Exception;

	/**
	 * 濡쒓렇?명솕硫댁씠誘몄??뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param loginScrinImage - 濡쒓렇?명솕硫댁씠誘몄? model
	 */
	public LoginScrinImageVO insertLoginScrinImage(LoginScrinImage loginScrinImage, LoginScrinImageVO loginScrinImageVO) throws Exception;

	/**
	 * 湲??깅줉??濡쒓렇?명솕硫댁씠誘몄??뺣낫瑜??섏젙?쒕떎.
	 * @param loginScrinImage - 濡쒓렇?명솕硫댁씠誘몄? model
	 */
	public void updateLoginScrinImage(LoginScrinImage loginScrinImage) throws Exception;

	/**
	 * 湲??깅줉??濡쒓렇?명솕硫댁씠誘몄??뺣낫瑜???젣?쒕떎.
	 * @param loginScrinImage - 濡쒓렇?명솕硫댁씠誘몄? model
	 */
	public void deleteLoginScrinImage(LoginScrinImage loginScrinImage) throws Exception;

	/**
	 * 湲??깅줉??濡쒓렇?명솕硫댁씠誘몄??뺣낫???뚯씪????젣?쒕떎.
	 * @param loginScrinImage - 濡쒓렇?명솕硫댁씠誘몄? model
	 */
	public void deleteLoginScrinImageFile(LoginScrinImage loginScrinImage) throws Exception;

	/**
	 * 濡쒓렇?명솕硫댁씠誘몄?媛 ?뱀젙?붾㈃??諛섏쁺??寃곌낵瑜?議고쉶?쒕떎.
	 * @param loginScrinImageVO - 濡쒓렇?명솕硫댁씠誘몄? VO
	 * @return LoginScrinImageVO - 濡쒓렇?명솕硫댁씠誘몄? VO
	 */
	public List<LoginScrinImageVO> selectLoginScrinImageResult(LoginScrinImageVO loginScrinImageVO) throws Exception;
	
}