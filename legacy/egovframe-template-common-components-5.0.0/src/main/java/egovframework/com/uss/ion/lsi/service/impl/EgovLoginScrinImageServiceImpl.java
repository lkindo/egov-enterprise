/**
 * 媛쒖슂
 * - 濡쒓렇?명솕硫댁씠誘몄??????ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 濡쒓렇?명솕硫댁씠誘몄???????깅줉, ?섏젙, ??젣, 議고쉶, 諛섏쁺?뺤씤 湲곕뒫???쒓났?쒕떎.
 * - 濡쒓렇?명솕硫댁씠誘몄???議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?대Ц以
 * @version 1.0
 * @created 05-8-2009 ?ㅽ썑 2:08:56
 *
 * ?섏젙
 * 2017.02.07 	?댁젙? 	?쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
 */

package egovframework.com.uss.ion.lsi.service.impl;

import java.io.File;
import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import egovframework.com.cmm.service.FileVO;
import egovframework.com.uss.ion.lsi.service.EgovLoginScrinImageService;
import egovframework.com.uss.ion.lsi.service.LoginScrinImage;
import egovframework.com.uss.ion.lsi.service.LoginScrinImageVO;
import jakarta.annotation.Resource;

@Service("egovLoginScrinImageService")
public class EgovLoginScrinImageServiceImpl extends EgovAbstractServiceImpl implements EgovLoginScrinImageService {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovLoginScrinImageServiceImpl.class);

	@Resource(name="loginScrinImageDAO")
    private LoginScrinImageDAO loginScrinImageDAO;

	/**
	 * 濡쒓렇?명솕硫댁씠誘몄??뺣낫瑜?愿由ы븯湲??꾪빐 ?깅줉??濡쒓렇?명솕硫댁씠誘몄? 紐⑸줉??議고쉶?쒕떎.
	 * @param loginScrinImageVO - 濡쒓렇?명솕硫댁씠誘몄? VO
	 * @return List - 濡쒓렇?명솕硫댁씠誘몄? 紐⑸줉
	 */
	@Override
	public List<LoginScrinImageVO> selectLoginScrinImageList(LoginScrinImageVO loginScrinImageVO) throws Exception{
		return loginScrinImageDAO.selectLoginScrinImageList(loginScrinImageVO);
	}

	/**
	 * 濡쒓렇?명솕硫댁씠誘몄?紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param loginScrinImageVO - 濡쒓렇?명솕硫댁씠誘몄? VO
	 * @return int - 濡쒓렇?명솕硫댁씠誘몄? 移댁슫????
	 */
	@Override
	public int selectLoginScrinImageListTotCnt(LoginScrinImageVO loginScrinImageVO) throws Exception {
		return loginScrinImageDAO.selectLoginScrinImageListTotCnt(loginScrinImageVO);
	}

	/**
	 * ?깅줉??濡쒓렇?명솕硫댁씠誘몄????곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param loginScrinImageVO - 濡쒓렇?명솕硫댁씠誘몄? VO
	 * @return LoginScrinImageVO - 濡쒓렇?명솕硫댁씠誘몄? VO
	 */
	@Override
	public LoginScrinImageVO selectLoginScrinImage(LoginScrinImageVO loginScrinImageVO) throws Exception {
		return loginScrinImageDAO.selectLoginScrinImage(loginScrinImageVO);
	}

	/**
	 * 濡쒓렇?명솕硫댁씠誘몄??뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param loginScrinImage - 濡쒓렇?명솕硫댁씠誘몄? model
	 */
	@Override
	public LoginScrinImageVO insertLoginScrinImage(LoginScrinImage loginScrinImage, LoginScrinImageVO loginScrinImageVO) throws Exception {
		loginScrinImageDAO.insertLoginScrinImage(loginScrinImage);
		loginScrinImageVO.setImageId(loginScrinImage.getImageId());
        return selectLoginScrinImage(loginScrinImageVO);
	}

	/**
	 * 湲??깅줉??濡쒓렇?명솕硫댁씠誘몄??뺣낫瑜??섏젙?쒕떎.
	 * @param loginScrinImage - 濡쒓렇?명솕硫댁씠誘몄? model
	 */
	@Override
	public void updateLoginScrinImage(LoginScrinImage loginScrinImage) throws Exception {
		loginScrinImageDAO.updateLoginScrinImage(loginScrinImage);
	}

	/**
	 * 湲??깅줉??濡쒓렇?명솕硫댁씠誘몄??뺣낫瑜???젣?쒕떎.
	 * @param loginScrinImage - 濡쒓렇?명솕硫댁씠誘몄? model
	 */
	@Override
	public void deleteLoginScrinImage(LoginScrinImage loginScrinImage) throws Exception {
		deleteLoginScrinImageFile(loginScrinImage);
		loginScrinImageDAO.deleteLoginScrinImage(loginScrinImage);
	}

	/**
	 * 湲??깅줉??濡쒓렇?명솕硫댁씠誘몄??뺣낫???뚯씪????젣?쒕떎.
	 * @param loginScrinImage - 濡쒓렇?명솕硫댁씠誘몄? model
	 */
	@Override
	public void deleteLoginScrinImageFile(LoginScrinImage loginScrinImage) throws Exception {
		FileVO fileVO = loginScrinImageDAO.selectLoginScrinImageFile(loginScrinImage);
		File file = new File(fileVO.getFileStreCours()+fileVO.getStreFileNm());
		//2017.02.08 	?댁젙? 	?쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
		if(file.delete()){
			LOGGER.debug("[file.delete] file : File Deletion Success");
		}else{
			LOGGER.error("[file.delete] file : File Deletion Fail");
		}
	}

	/**
	 * 濡쒓렇?명솕硫댁씠誘몄?媛 ?뱀젙?붾㈃??諛섏쁺??寃곌낵瑜?議고쉶?쒕떎.
	 * @param loginScrinImageVO - 濡쒓렇?명솕硫댁씠誘몄? VO
	 * @return LoginScrinImageVO - 濡쒓렇?명솕硫댁씠誘몄? VO
	 */
	@Override
	public List<LoginScrinImageVO> selectLoginScrinImageResult(LoginScrinImageVO loginScrinImageVO) throws Exception {
		return loginScrinImageDAO.selectLoginScrinImageResult(loginScrinImageVO);
	}
}
