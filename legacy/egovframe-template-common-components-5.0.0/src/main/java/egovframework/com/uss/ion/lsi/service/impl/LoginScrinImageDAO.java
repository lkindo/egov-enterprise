**
 * 媛쒖슂
 * - 濡쒓렇?명솕硫댁씠誘몄??????DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - 濡쒓렇?명솕硫댁씠誘몄???????깅줉, ?섏젙, ??젣, 議고쉶, 諛섏쁺?뺤씤 湲곕뒫???쒓났?쒕떎.
 * - 濡쒓렇?명솕硫댁씠誘몄???議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author lee.m.j
 * @version 1.0
 * @created 2009.08.07 ?ㅽ썑 2:08:56
 */

package egovframework.com.uss.ion.lsi.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.FileVO;
import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.uss.ion.lsi.service.LoginScrinImage;
import egovframework.com.uss.ion.lsi.service.LoginScrinImageVO;

@Repository("loginScrinImageDAO")
public class LoginScrinImageDAO extends EgovComAbstractDAO {

	/**
	 * 濡쒓렇?명솕硫댁씠誘몄??뺣낫瑜?愿由ы븯湲??꾪빐 ?깅줉??濡쒓렇?명솕硫댁씠誘몄? 紐⑸줉??議고쉶?쒕떎.
	 * @param loginScrinImageVO - 濡쒓렇?명솕硫댁씠誘몄? VO
	 * @return List - 濡쒓렇?명솕硫댁씠誘몄? 紐⑸줉
	 */	
	public List<LoginScrinImageVO> selectLoginScrinImageList(LoginScrinImageVO loginScrinImageVO) throws Exception {
		return selectList("loginScrinImageDAO.selectLoginScrinImageList", loginScrinImageVO);
	}

    /**
	 * 濡쒓렇?명솕硫댁씠誘몄?紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param loginScrinImageVO - 濡쒓렇?명솕硫댁씠誘몄? VO
	 * @return int
	 * @exception Exception
	 */
    public int selectLoginScrinImageListTotCnt(LoginScrinImageVO loginScrinImageVO) throws Exception {
        return (Integer)selectOne("loginScrinImageDAO.selectLoginScrinImageListTotCnt", loginScrinImageVO);
    }

	/**
	 * ?깅줉??濡쒓렇?명솕硫댁씠誘몄????곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param loginScrinImageVO - 濡쒓렇?명솕硫댁씠誘몄? VO
	 * @return LoginScrinImageVO - 濡쒓렇?명솕硫댁씠誘몄? VO
	 */
	public LoginScrinImageVO selectLoginScrinImage(LoginScrinImageVO loginScrinImageVO)  throws Exception {
		return (LoginScrinImageVO) selectOne("loginScrinImageDAO.selectLoginScrinImage", loginScrinImageVO);
	}

	/**
	 * 濡쒓렇?명솕硫댁씠誘몄??뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param loginScrinImage - 濡쒓렇?명솕硫댁씠誘몄? model
	 */
	public void insertLoginScrinImage(LoginScrinImage loginScrinImage) throws Exception {
		insert("loginScrinImageDAO.insertLoginScrinImage", loginScrinImage);
	}

	/**
	 * 湲??깅줉??濡쒓렇?명솕硫댁씠誘몄??뺣낫瑜??섏젙?쒕떎.
	 * @param loginScrinImage - 濡쒓렇?명솕硫댁씠誘몄? model
	 */
	public void updateLoginScrinImage(LoginScrinImage loginScrinImage) throws Exception {
		update("loginScrinImageDAO.updateLoginScrinImage", loginScrinImage);
	}

	/**
	 * 湲??깅줉??濡쒓렇?명솕硫댁씠誘몄??뺣낫瑜???젣?쒕떎.
	 * @param loginScrinImage - 濡쒓렇?명솕硫댁씠誘몄? model
	 */
	public void deleteLoginScrinImage(LoginScrinImage loginScrinImage) throws Exception {
        delete("loginScrinImageDAO.deleteLoginScrinImage",loginScrinImage);
	}

	/**
	 * 湲??깅줉??濡쒓렇?명솕硫댁씠誘몄??뺣낫???대?吏?뚯씪????젣?섍린 ?꾪빐 ?뚯씪?뺣낫瑜?議고쉶?쒕떎.
	 * @param loginScrinImage - 濡쒓렇?명솕硫댁씠誘몄? model
	 */
	public FileVO selectLoginScrinImageFile(LoginScrinImage loginScrinImage) throws Exception {
		return (FileVO) selectOne("loginScrinImageDAO.selectLoginScrinImageFile", loginScrinImage);
	}

	/**
	 * 濡쒓렇?명솕硫댁씠誘몄?媛 ?뱀젙?붾㈃??諛섏쁺??寃곌낵瑜?議고쉶?쒕떎.
	 * @param loginScrinImageVO - 濡쒓렇?명솕硫댁씠誘몄? VO
	 * @return LoginScrinImageVO - 濡쒓렇?명솕硫댁씠誘몄? VO
	 */
	public List<LoginScrinImageVO> selectLoginScrinImageResult(LoginScrinImageVO loginScrinImageVO) throws Exception {
		return selectList("loginScrinImageDAO.selectLoginScrinImageResult", loginScrinImageVO);
	}
}
