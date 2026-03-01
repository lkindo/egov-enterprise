**
 * 媛쒖슂
 * - ?뚯쓽?ㅺ?由ъ뿉 ???ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?뚯쓽?ㅺ?由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶, 諛섏쁺?뺤씤 湲곕뒫???쒓났?쒕떎.
 * - ?뚯쓽?ㅺ?由ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?댁슜
 * @version 1.0
 * @created 06-15-2010 ?ㅽ썑 2:08:56
 */

package egovframework.com.uss.ion.mtg.service.impl;

import java.util.ArrayList;
import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import egovframework.com.uss.ion.mtg.service.EgovMtgPlaceManageService;
import egovframework.com.uss.ion.mtg.service.MtgPlaceManage;
import egovframework.com.uss.ion.mtg.service.MtgPlaceManageVO;
import egovframework.com.uss.ion.mtg.service.MtgPlaceResve;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;


@Service("egovMtgPlaceManageService")
public class EgovMtgPlaceManageServiceImpl extends EgovAbstractServiceImpl implements EgovMtgPlaceManageService {

	@Resource(name="mtgPlaceManageDAO")
    private MtgPlaceManageDAO mtgPlaceManageDAO;

    /** ID Generation */
	@Resource(name="egovMtgPlaceManageIdGnrService")
	private EgovIdGnrService idgenService;

    /** ID Generation */
	@Resource(name="egovMtgPlaceResveIdGnrService")
	private EgovIdGnrService idgenResveService;

	/**
	 * ?뚯쓽?ㅺ?由ъ젙蹂대? 愿由ы븯湲??꾪빐 ?깅줉???뚯쓽?ㅺ?由?紐⑸줉??議고쉶?쒕떎.
	 * @param mtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 * @return List - ?뚯쓽?ㅺ?由?紐⑸줉
	 */
	@Override
	public List<MtgPlaceManageVO> selectMtgPlaceManageList(MtgPlaceManageVO mtgPlaceManageVO) throws Exception{
		return mtgPlaceManageDAO.selectMtgPlaceManageList(mtgPlaceManageVO);
	}

	/**
	 * ?뚯쓽?ㅺ?由щぉ濡?珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param mtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 * @return int - ?뚯쓽?ㅺ?由?移댁슫????
	 */
	@Override
	public int selectMtgPlaceManageListTotCnt(MtgPlaceManageVO mtgPlaceManageVO) throws Exception {
		return mtgPlaceManageDAO.selectMtgPlaceManageListTotCnt(mtgPlaceManageVO);
	}

	/**
	 * ?깅줉???뚯쓽?ㅺ?由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param mtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 * @return MtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 */
	@Override
	public MtgPlaceManage selectMtgPlaceManage(MtgPlaceManageVO mtgPlaceManageVO) throws Exception {
		return mtgPlaceManageDAO.selectMtgPlaceManage(mtgPlaceManageVO);
	}

	/**
	 * ?뚯쓽?ㅺ?由ъ젙蹂대? ?좉퇋濡??깅줉?쒕떎.
	 * @param mtgPlaceManage   - ?뚯쓽?ㅺ?由?model
	 * @param String           - ?뚯쓽?ㅻ퉬?덉젙蹂?
	 * @param MtgPlaceManageVO - ?뚯쓽?ㅺ?由촚Ol
	 */
	@Override
	@SuppressWarnings("unused")
	public void insertMtgPlaceManage(MtgPlaceManage mtgPlaceManage,
			                         MtgPlaceManageVO mtgPlaceManageVO) throws Exception {
		String	mtgPlaceId = idgenService.getNextStringId();
		mtgPlaceManage.setMtgPlaceId(mtgPlaceId);

		mtgPlaceManageDAO.insertMtgPlaceManage(mtgPlaceManage);
		int insertCnt    = 0;
		String [] sTempMtgPlaces;
		String    sTemp=null;

	}

	/**
	 * 湲??깅줉???뚯쓽?ㅺ?由ъ젙蹂대? ?섏젙?쒕떎.
	 * @param mtgPlaceManage - ?뚯쓽?ㅺ?由?model
	 */
	@Override
	public void updtMtgPlaceManage(MtgPlaceManage mtgPlaceManage,
            					   MtgPlaceManageVO mtgPlaceManageVO) throws Exception {

		mtgPlaceManageDAO.updtMtgPlaceManage(mtgPlaceManage);
//		String sMtgPlaceId = mtgPlaceManage.getMtgPlaceId();

		}

	/**
	 * 湲??깅줉???뚯쓽?ㅺ?由ъ젙蹂대? ??젣?쒕떎.
	 * @param mtgPlaceManage - ?뚯쓽?ㅺ?由?model
	 */
	@Override
	public void deleteMtgPlaceManage(MtgPlaceManage mtgPlaceManage) throws Exception {
//		String sMtgPlaceId = mtgPlaceManage.getMtgPlaceId();
		mtgPlaceManageDAO.deleteMtgPlaceManage(mtgPlaceManage);
	}

	/******** ?뚯쓽???덉빟 愿由?*************/

	/**
	 * ?뚯쓽???덉빟?뺣낫瑜?愿由ы븯湲??꾪빐 ?깅줉???뚯쓽???덉빟 紐⑸줉??議고쉶?쒕떎.
	 * @param mtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 * @return List - ?뚯쓽?ㅺ?由?紐⑸줉
	 */
	@Override
	public List<MtgPlaceManageVO> selectMtgPlaceResveManageList(MtgPlaceManageVO mtgPlaceManageVO) throws Exception{

		List<MtgPlaceManageVO> result = mtgPlaceManageDAO.selectMtgPlaceIDList(mtgPlaceManageVO);
		List<MtgPlaceManageVO> list = new ArrayList<>();
		String tempResveDe = EgovStringUtil.removeMinusChar(mtgPlaceManageVO.getResveDe());
		int num = result.size();

	    for (int i = 0 ; i < num ; i ++ ){
	    	MtgPlaceManageVO mtgPlaceManageVO1 = result.get(i);
	    	mtgPlaceManageVO1.setResveDe(tempResveDe);
	        list.add(mtgPlaceManageDAO.selectMtgPlaceResveManageList(mtgPlaceManageVO1));
	    }

		return list;
	}

	/**
	 * ?뚯쓽?ㅼ삁???좎껌?붾㈃??議고쉶?쒕떎.
	 * @param mtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 * @return MtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 */
	@Override
	public MtgPlaceManageVO selectMtgPlaceResve(MtgPlaceManageVO mtgPlaceManageVO) throws Exception {
		return mtgPlaceManageDAO.selectMtgPlaceResve(mtgPlaceManageVO);
	}

	/**
	 * ?깅줉???뚯쓽???덉빟 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param mtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 * @return MtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 */
	@Override
	public MtgPlaceManageVO selectMtgPlaceResveDetail(MtgPlaceManageVO mtgPlaceManageVO) throws Exception {
		return mtgPlaceManageDAO.selectMtgPlaceResveDetail(mtgPlaceManageVO);
	}

	/**
	 * ?뚯쓽???덉빟?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param mtgPlaceManage - ?뚯쓽?ㅼ삁??model
	 */
	@Override
	public void insertMtgPlaceResve(MtgPlaceResve mtgPlaceResve) throws Exception {
		mtgPlaceResve.setResveDe(EgovStringUtil.removeMinusChar(mtgPlaceResve.getResveDe()));
		String	sResveId = idgenResveService.getNextStringId();
		mtgPlaceResve.setResveId(sResveId);
		mtgPlaceManageDAO.insertMtgPlaceResve(mtgPlaceResve);
	}

	/**
	 * 湲??깅줉???뚯쓽???덉빟?뺣낫瑜??섏젙?쒕떎.
	 * @param mtgPlaceManage - ?뚯쓽?ㅼ삁??model
	 */
	@Override
	public void updtMtgPlaceResve(MtgPlaceResve mtgPlaceResve) throws Exception {
		mtgPlaceResve.setResveDe(EgovStringUtil.removeMinusChar(mtgPlaceResve.getResveDe()));
		mtgPlaceManageDAO.updtMtgPlaceResve(mtgPlaceResve);
	}

	/**
	 * 湲??깅줉???뚯쓽???덉빟?뺣낫瑜???젣?쒕떎.
	 * @param mtgPlaceManage - ?뚯쓽?ㅼ삁??model
	 */
	@Override
	public void deleteMtgPlaceResve(MtgPlaceResve mtgPlaceResve) throws Exception {
		mtgPlaceResve.setResveDe(EgovStringUtil.removeMinusChar(mtgPlaceResve.getResveDe()));
		mtgPlaceManageDAO.deleteMtgPlaceResve(mtgPlaceResve);
	}


	/**
	 * ?뚯쓽??以묐났?щ? 泥댄겕.
	 * @param mtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 * @return int - 以묐났嫄댁닔
	 */
	@Override
	public int mtgPlaceResveDplactCeck(MtgPlaceManageVO mtgPlaceManageVO) throws Exception {
		mtgPlaceManageVO.setResveDe(EgovStringUtil.removeMinusChar(mtgPlaceManageVO.getResveDe()));
		return mtgPlaceManageDAO.mtgPlaceResveDplactCeck(mtgPlaceManageVO);
	}

}
