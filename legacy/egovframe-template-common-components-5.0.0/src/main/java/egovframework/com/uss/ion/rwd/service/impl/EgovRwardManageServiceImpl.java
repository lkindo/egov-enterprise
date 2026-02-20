package egovframework.com.uss.ion.rwd.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import egovframework.com.uss.ion.ism.service.EgovInfrmlSanctnService;
import egovframework.com.uss.ion.ism.service.InfrmlSanctn;
import egovframework.com.uss.ion.rwd.service.EgovRwardManageService;
import egovframework.com.uss.ion.rwd.service.RwardManage;
import egovframework.com.uss.ion.rwd.service.RwardManageVO;
import egovframework.com.utl.fcc.service.EgovDateUtil;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;

/**
 * 媛쒖슂
 * - ?ъ긽愿由ъ뿉 ???ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?ъ긽愿由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶, ?뱀씤泥섎━ 湲곕뒫???쒓났?쒕떎.
 * - ?ъ긽愿由ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?댁슜
 * @version 1.0
 * @created 06-15-2010 ?ㅽ썑 2:08:56
 */

@Service("egovRwardManageService")
public class EgovRwardManageServiceImpl extends EgovAbstractServiceImpl implements EgovRwardManageService {

	@Resource(name="rwardManageDAO")
    private RwardManageDAO rwardManageDAO;

    /** ID Generation */
	@Resource(name="egovRwardManageIdGnrService")
	private EgovIdGnrService idgenRwardManageService;

	@Resource(name="EgovInfrmlSanctnService")
    protected EgovInfrmlSanctnService infrmlSanctnService;

	/**
	 * ?ъ긽愿由ъ젙蹂대? 愿由ы븯湲??꾪빐 ?깅줉???ъ긽愿由?紐⑸줉??議고쉶?쒕떎.
	 * @param rwardManageVO - ?ъ긽愿由?VO
	 * @return List - ?ъ긽愿由?紐⑸줉
	 */
	@Override
	public List<RwardManageVO> selectRwardManageList(RwardManageVO rwardManageVO) throws Exception{
		rwardManageVO.setSearchFromDate(EgovStringUtil.removeMinusChar(rwardManageVO.getSearchFromDate()));
		rwardManageVO.setSearchToDate(EgovStringUtil.removeMinusChar(rwardManageVO.getSearchToDate()));
		List<RwardManageVO> result = rwardManageDAO.selectRwardManageList(rwardManageVO);


		int num = result.size();

	    for (int i = 0 ; i < num ; i ++ ){
	    	RwardManageVO rwardManageVO1 = result.get(i);
	    	rwardManageVO1.setRwardDe(EgovDateUtil.formatDate(rwardManageVO1.getRwardDe(), "-"));
	    	result.set(i, rwardManageVO1);
	    }
		return result;
	}

	/**
	 * ?ъ긽愿由щぉ濡?珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param rwardManageVO - ?ъ긽愿由?VO
	 * @return int - ?ъ긽愿由?移댁슫????
	 */
	@Override
	public int selectRwardManageListTotCnt(RwardManageVO rwardManageVO) throws Exception {
		return rwardManageDAO.selectRwardManageListTotCnt(rwardManageVO);
	}

	/**
	 * ?깅줉???ъ긽愿由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param rwardManageVO - ?ъ긽愿由?VO
	 * @return RwardManageVO - ?ъ긽愿由?VO
	 */
	@Override
	public RwardManageVO selectRwardManage(RwardManageVO rwardManageVO) throws Exception {

		RwardManageVO rwardManageVOTemp = rwardManageDAO.selectRwardManage(rwardManageVO);
		rwardManageVOTemp.setRwardDe(EgovDateUtil.formatDate(rwardManageVOTemp.getRwardDe(), "-"));

		return rwardManageVOTemp;
	}

	/**
	 * ?ъ긽愿由ъ젙蹂대? ?좉퇋濡??깅줉?쒕떎.
	 * @param rwardManage - ?ъ긽愿由?model
	 */
	@Override
	public void insertRwardManage(RwardManage rwardManage) throws Exception {

		/*
		 * ?ъ긽 ?뱀씤泥섎━  ?좎껌 infrmlSanctnService.insertInfrmlSanctn("000", vcatnManage);
		 */
		rwardManage.setRwardDe(EgovStringUtil.removeMinusChar(rwardManage.getRwardDe()));
       	InfrmlSanctn infrmlSanctn = infrmlSanctnService.insertInfrmlSanctn(converToInfrmlSanctnObject(rwardManage)); //?좎껌
		rwardManage.setInfrmlSanctnId(infrmlSanctn.getInfrmlSanctnId());
		rwardManage.setConfmAt(infrmlSanctn.getConfmAt());

		String	sRwardId = idgenRwardManageService.getNextStringId();
		rwardManage.setRwardId(sRwardId);

		rwardManageDAO.insertRwardManage(rwardManage);
	}

	/**
	 * 湲??깅줉???ъ긽愿由ъ젙蹂대? ?섏젙?쒕떎.
	 * @param rwardManage - ?ъ긽愿由?model
	 */
	@Override
	public void updtRwardManage(RwardManage rwardManage) throws Exception {
		rwardManage.setRwardDe(EgovStringUtil.removeMinusChar(rwardManage.getRwardDe()));
		rwardManageDAO.updtRwardManage(rwardManage);
	}

	/**
	 * 湲??깅줉???ъ긽愿由ъ젙蹂대? ??젣?쒕떎.
	 * @param rwardManage - ?ъ긽愿由?model
	 */
	@Override
	public void deleteRwardManage(RwardManage rwardManage) throws Exception {
		/*
		 * ?ъ긽 ?뱀씤泥섎━  ??젣 infrmlSanctnService.deleteInfrmlSanctn("000", vcatnManage);
		 */
		rwardManage.setRwardDe(EgovStringUtil.removeMinusChar(rwardManage.getRwardDe()));
        infrmlSanctnService.deleteInfrmlSanctn(converToInfrmlSanctnObject(rwardManage));  //??젣
		rwardManageDAO.deleteRwardManage(rwardManage);
	}



	/**
	 * ?ъ긽愿由ъ젙蹂??뱀씤 泥섎━瑜??꾪빐 ?좎껌???ъ긽愿由?紐⑸줉??議고쉶?쒕떎.
	 * @param rwardManageVO - ?ъ긽愿由?VO
	 * @return List - ?ъ긽愿由?紐⑸줉
	 */
	@Override
	public List<RwardManageVO> selectRwardManageConfmList(RwardManageVO rwardManageVO) throws Exception{
		rwardManageVO.setSearchFromDate(EgovStringUtil.removeMinusChar(rwardManageVO.getSearchFromDate()));
		rwardManageVO.setSearchToDate(EgovStringUtil.removeMinusChar(rwardManageVO.getSearchToDate()));
		List<RwardManageVO> result = rwardManageDAO.selectRwardManageConfmList(rwardManageVO);

		int num = result.size();

	    for (int i = 0 ; i < num ; i ++ ){
	    	RwardManageVO rwardManageVO1 = result.get(i);
	    	rwardManageVO1.setRwardDe(EgovDateUtil.formatDate(rwardManageVO1.getRwardDe(), "-"));
	    	result.set(i, rwardManageVO1);
	    }
		return result;
	}

	/**
	 * ?ъ긽?뱀씤紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param rwardManageVO - ?ъ긽愿由?VO
	 * @return int - ?ъ긽愿由?移댁슫????
	 */
	@Override
	public int selectRwardManageConfmListTotCnt(RwardManageVO rwardManageVO) throws Exception {
		return rwardManageDAO.selectRwardManageConfmListTotCnt(rwardManageVO);
	}

	/**
	 * ?ъ긽?뺣낫瑜??뱀씤/諛섎젮泥섎━ ?쒕떎.
	 * @param rwardManage - ?ъ긽愿由?model
	 */
	@Override
	public void updtRwardManageConfm(RwardManage rwardManage) throws Exception {
		InfrmlSanctn infrmlSanctn = new InfrmlSanctn();
		rwardManage.setRwardDe(EgovStringUtil.removeMinusChar(rwardManage.getRwardDe()));
		//KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
		if("C".equals(rwardManage.getConfmAt())){
			/*
			 * ?뱀씤泥섎━
			 */
			infrmlSanctn = infrmlSanctnService.updateInfrmlSanctnConfm(converToInfrmlSanctnObject(rwardManage));  //?뱀씤
			//infrmlSanctn = infrmlSanctnService.updateInfrmlSanctnConfm("002", rwardManage);
		}else if("R".equals(rwardManage.getConfmAt())){
			/*
			 * 諛섎젮泥섎━
			 */
			infrmlSanctn = infrmlSanctnService.updateInfrmlSanctnReturn(converToInfrmlSanctnObject(rwardManage));  //諛섎젮
			//infrmlSanctn = infrmlSanctnService.updateInfrmlSanctnReturn("002", rwardManage);
		}
		rwardManage.setSanctnDt(infrmlSanctn.getSanctnDt());
		rwardManage.setConfmAt(infrmlSanctn.getConfmAt());

		rwardManageDAO.updtRwardManageConfm(rwardManage);
	}

	/**
	 * RwardManage model??InfrmlSanctn model濡?蹂?섑븳??
	 * @param RwardManage
	 * @return InfrmlSanctn
	 * @param rwardManage
	 */
	private InfrmlSanctn converToInfrmlSanctnObject(RwardManage rwardManage) throws Exception{
		InfrmlSanctn infrmlSanctn = new InfrmlSanctn();
    	infrmlSanctn.setJobSeCode("002");								// ?낅Т援щ텇肄붾뱶 (怨듯넻肄붾뱶 COM75)
    	infrmlSanctn.setApplcntId(rwardManage.getRwardManId());			// ?ъ긽?륤D
    	infrmlSanctn.setReqstDe(rwardManage.getRwardDe());				// ?ъ긽?쇱옄
    	infrmlSanctn.setSanctnerId(rwardManage.getSanctnerId());		// 寃곗옱?륤D
    	infrmlSanctn.setConfmAt(rwardManage.getConfmAt());				// ?뱀씤援щ텇
    	infrmlSanctn.setSanctnDt(rwardManage.getSanctnDt());			// 寃곗옱?쇱떆
    	infrmlSanctn.setReturnResn(rwardManage.getReturnResn());		// 諛섎젮?ъ쑀
    	infrmlSanctn.setFrstRegisterId(rwardManage.getFrstRegisterId());
    	infrmlSanctn.setFrstRegisterPnttm(rwardManage.getFrstRegisterId());
    	infrmlSanctn.setLastUpdusrId(rwardManage.getLastUpdusrId());
    	infrmlSanctn.setLastUpdusrPnttm(rwardManage.getLastUpdusrPnttm());
    	infrmlSanctn.setInfrmlSanctnId(rwardManage.getInfrmlSanctnId());// ?쎌떇寃곗옱ID
    	return infrmlSanctn;
	}

}
