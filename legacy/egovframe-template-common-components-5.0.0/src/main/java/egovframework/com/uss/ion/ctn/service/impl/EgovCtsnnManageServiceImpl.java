package egovframework.com.uss.ion.ctn.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import egovframework.com.uss.ion.ctn.service.CtsnnManage;
import egovframework.com.uss.ion.ctn.service.CtsnnManageVO;
import egovframework.com.uss.ion.ctn.service.EgovCtsnnManageService;
import egovframework.com.uss.ion.ism.service.EgovInfrmlSanctnService;
import egovframework.com.uss.ion.ism.service.InfrmlSanctn;
import egovframework.com.utl.fcc.service.EgovDateUtil;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;

/**
 * 媛쒖슂
 * - 寃쎌“愿由ъ뿉 ???ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 寃쎌“愿由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶, 諛섏쁺?뺤씤 湲곕뒫???쒓났?쒕떎.
 * - 寃쎌“愿由ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?댁슜
 * @version 1.0
 * @created 06-15-2010 ?ㅽ썑 2:08:56
 */

@Service("egovCtsnnManageService")
public class EgovCtsnnManageServiceImpl extends EgovAbstractServiceImpl implements EgovCtsnnManageService {

	@Resource(name="ctsnnManageDAO")
    private CtsnnManageDAO ctsnnManageDAO;

    /** ID Generation */
	@Resource(name="egovCtsnnManageIdGnrService")
	private EgovIdGnrService idgenCtsnnManageService;


	@Resource(name="EgovInfrmlSanctnService")
    protected EgovInfrmlSanctnService infrmlSanctnService;

	/**
	 * 寃쎌“愿由ъ젙蹂대? 愿由ы븯湲??꾪빐 ?깅줉??寃쎌“愿由?紐⑸줉??議고쉶?쒕떎.
	 * @param ctsnnManageVO - 寃쎌“愿由?VO
	 * @return List - 寃쎌“愿由?紐⑸줉
	 */
	@Override
	public List<CtsnnManageVO> selectCtsnnManageList(CtsnnManageVO ctsnnManageVO) throws Exception{
		ctsnnManageVO.setSearchFromDate(EgovStringUtil.removeMinusChar(ctsnnManageVO.getSearchFromDate()));
		ctsnnManageVO.setSearchToDate(EgovStringUtil.removeMinusChar(ctsnnManageVO.getSearchToDate()));
		List<CtsnnManageVO> result = ctsnnManageDAO.selectCtsnnManageList(ctsnnManageVO);

		int num = result.size();

	    for (int i = 0 ; i < num ; i ++ ){
	    	CtsnnManageVO ctsnnManageVO1 = result.get(i);
	    	ctsnnManageVO1.setReqstDe(EgovDateUtil.formatDate(ctsnnManageVO1.getReqstDe(), "-"));
	    	ctsnnManageVO1.setOccrrDe(EgovDateUtil.formatDate(ctsnnManageVO1.getOccrrDe(), "-"));
	    	result.set(i, ctsnnManageVO1);
	    }
		return result;
	}

	/**
	 * 寃쎌“愿由щぉ濡?珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param ctsnnManageVO - 寃쎌“愿由?VO
	 * @return int - 寃쎌“愿由?移댁슫????
	 */
	@Override
	public int selectCtsnnManageListTotCnt(CtsnnManageVO ctsnnManageVO) throws Exception {
		return ctsnnManageDAO.selectCtsnnManageListTotCnt(ctsnnManageVO);
	}

	/**
	 * ?깅줉??寃쎌“愿由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param ctsnnManageVO - 寃쎌“愿由?VO
	 * @return CtsnnManageVO - 寃쎌“愿由?VO
	 */
	@Override
	public CtsnnManageVO selectCtsnnManage(CtsnnManageVO ctsnnManageVO) throws Exception {

		CtsnnManageVO ctsnnManageVOTemp = ctsnnManageDAO.selectCtsnnManage(ctsnnManageVO);
		ctsnnManageVOTemp.setReqstDe(EgovDateUtil.formatDate(ctsnnManageVOTemp.getReqstDe(), "-"));
		ctsnnManageVOTemp.setOccrrDe(EgovDateUtil.formatDate(ctsnnManageVOTemp.getOccrrDe(), "-"));
		ctsnnManageVOTemp.setBrth(EgovDateUtil.formatDate(ctsnnManageVOTemp.getBrth(), "-"));
		return ctsnnManageVOTemp;
	}

	/**
	 * 寃쎌“愿由ъ젙蹂대? ?좉퇋濡??깅줉?쒕떎.
	 * @param ctsnnManage - 寃쎌“愿由?model
	 */
	@Override
	public void insertCtsnnManage(CtsnnManage ctsnnManage) throws Exception {

		java.util.Calendar cal = java.util.Calendar.getInstance();
    	String  sYear  =Integer.toString(cal.get(java.util.Calendar.YEAR));
    	String  sMonth =Integer.toString(cal.get(java.util.Calendar.MONTH)+1);
    	if(sMonth.length() == 1) {
			sMonth = "0"+sMonth;
		}
    	String  sDay   =Integer.toString(cal.get(java.util.Calendar.DATE));
    	if(sDay.length() == 1) {
			sDay = "0"+sDay;
		}
    	ctsnnManage.setReqstDe(sYear+sMonth+sDay);

		/*
		 * 寃쎌“ ?뱀씤泥섎━  ?좎껌
		 */
		//InfrmlSanctn infrmlSanctn = infrmlSanctnService.insertInfrmlSanctn("001", ctsnnManage);

    	ctsnnManage.setReqstDe(EgovStringUtil.removeMinusChar(ctsnnManage.getReqstDe()));
    	ctsnnManage.setBrth(EgovStringUtil.removeMinusChar(ctsnnManage.getBrth()));
    	ctsnnManage.setOccrrDe(EgovStringUtil.removeMinusChar(ctsnnManage.getOccrrDe()));
		InfrmlSanctn infrmlSanctn = infrmlSanctnService.insertInfrmlSanctn(converToInfrmlSanctnObject(ctsnnManage)); //?좎껌
		ctsnnManage.setInfrmlSanctnId(infrmlSanctn.getInfrmlSanctnId());
		ctsnnManage.setConfmAt(infrmlSanctn.getConfmAt());

		String	sCtsnnId = idgenCtsnnManageService.getNextStringId();
		ctsnnManage.setCtsnnId(sCtsnnId);

		ctsnnManageDAO.insertCtsnnManage(ctsnnManage);
	}

	/**
	 * 湲??깅줉??寃쎌“愿由ъ젙蹂대? ?섏젙?쒕떎.
	 * @param ctsnnManage - 寃쎌“愿由?model
	 */
	@Override
	public void updtCtsnnManage(CtsnnManage ctsnnManage) throws Exception {
		ctsnnManage.setReqstDe(EgovStringUtil.removeMinusChar(ctsnnManage.getReqstDe()));
    	ctsnnManage.setBrth(EgovStringUtil.removeMinusChar(ctsnnManage.getBrth()));
    	ctsnnManage.setOccrrDe(EgovStringUtil.removeMinusChar(ctsnnManage.getOccrrDe()));
		ctsnnManage.setBrth(EgovStringUtil.removeMinusChar(ctsnnManage.getBrth()));
		ctsnnManage.setOccrrDe(EgovStringUtil.removeMinusChar(ctsnnManage.getOccrrDe()));
		ctsnnManageDAO.updtCtsnnManage(ctsnnManage);
	}

	/**
	 * 湲??깅줉??寃쎌“愿由ъ젙蹂대? ??젣?쒕떎.
	 * @param ctsnnManage - 寃쎌“愿由?model
	 */
	@Override
	public void deleteCtsnnManage(CtsnnManage ctsnnManage) throws Exception {
		ctsnnManage.setReqstDe(EgovStringUtil.removeMinusChar(ctsnnManage.getReqstDe()));
    	ctsnnManage.setBrth(EgovStringUtil.removeMinusChar(ctsnnManage.getBrth()));
    	ctsnnManage.setOccrrDe(EgovStringUtil.removeMinusChar(ctsnnManage.getOccrrDe()));
		/*
		 * ?ъ긽 ?뱀씤泥섎━  ??젣 infrmlSanctnService.deleteInfrmlSanctn("000", vcatnManage);
		 */
		infrmlSanctnService.deleteInfrmlSanctn(converToInfrmlSanctnObject(ctsnnManage));  //??젣
		//infrmlSanctnService.deleteInfrmlSanctn("001", ctsnnManage);
		ctsnnManageDAO.deleteCtsnnManage(ctsnnManage);
	}

	/**
	 * 寃쎌“愿由ъ젙蹂??뱀씤 泥섎━瑜??꾪빐 ?좎껌??寃쎌“愿由?紐⑸줉??議고쉶?쒕떎.
	 * @param ctsnnManageVO - 寃쎌“愿由?VO
	 * @return List - 寃쎌“愿由?紐⑸줉
	 */
	@Override
	public List<CtsnnManageVO> selectCtsnnManageConfmList(CtsnnManageVO ctsnnManageVO) throws Exception{
		ctsnnManageVO.setSearchFromDate(EgovStringUtil.removeMinusChar(ctsnnManageVO.getSearchFromDate()));
		ctsnnManageVO.setSearchToDate(EgovStringUtil.removeMinusChar(ctsnnManageVO.getSearchToDate()));
		List<CtsnnManageVO> result = ctsnnManageDAO.selectCtsnnManageConfmList(ctsnnManageVO);
		int num = result.size();

	    for (int i = 0 ; i < num ; i ++ ){
	    	CtsnnManageVO ctsnnManageVO1 = result.get(i);
	    	ctsnnManageVO1.setReqstDe(EgovDateUtil.formatDate(ctsnnManageVO1.getReqstDe(), "-"));
	    	ctsnnManageVO1.setOccrrDe(EgovDateUtil.formatDate(ctsnnManageVO1.getOccrrDe(), "-"));
	    	result.set(i, ctsnnManageVO1);
	    }
		return result;
	}

	/**
	 * 寃쎌“?뱀씤紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param ctsnnManageVO - 寃쎌“愿由?VO
	 * @return int - 寃쎌“愿由?移댁슫????
	 */
	@Override
	public int selectCtsnnManageConfmListTotCnt(CtsnnManageVO ctsnnManageVO) throws Exception {
		return ctsnnManageDAO.selectCtsnnManageConfmListTotCnt(ctsnnManageVO);
	}

	/**
	 * 寃쎌“?뺣낫瑜??뱀씤泥섎━ ?쒕떎.
	 * @param ctsnnManage - 寃쎌“愿由?model
	 */
	@Override
	public void updtCtsnnManageConfm(CtsnnManage ctsnnManage) throws Exception {
		 InfrmlSanctn infrmlSanctn = new InfrmlSanctn();
		 ctsnnManage.setReqstDe(EgovStringUtil.removeMinusChar(ctsnnManage.getReqstDe()));
	     ctsnnManage.setBrth(EgovStringUtil.removeMinusChar(ctsnnManage.getBrth()));
	     ctsnnManage.setOccrrDe(EgovStringUtil.removeMinusChar(ctsnnManage.getOccrrDe()));
	   //KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
		 if("C".equals(ctsnnManage.getConfmAt())){
			/*
			 * ?뱀씤泥섎━
			 */
			 infrmlSanctn = infrmlSanctnService.updateInfrmlSanctnConfm(converToInfrmlSanctnObject(ctsnnManage));  //?뱀씤
			 //infrmlSanctn = infrmlSanctnService.updateInfrmlSanctnConfm("001", ctsnnManage);
		 }else if("R".equals(ctsnnManage.getConfmAt())){
			/*
			 * 諛섎젮泥섎━
			 */
			 //infrmlSanctn = infrmlSanctnService.updateInfrmlSanctnReturn("001", ctsnnManage);
			 infrmlSanctn = infrmlSanctnService.updateInfrmlSanctnReturn(converToInfrmlSanctnObject(ctsnnManage));
		 }
		 ctsnnManage.setSanctnDt(infrmlSanctn.getSanctnDt());
		 ctsnnManage.setConfmAt(infrmlSanctn.getConfmAt());

		 ctsnnManageDAO.updtCtsnnManageConfm(ctsnnManage);
	}

	/**
	 * CtsnnManage model??InfrmlSanctn model濡?蹂?섑븳??
	 * @param CtsnnManage
	 * @return InfrmlSanctn
	 * @param ctsnnManage
	 */
	private InfrmlSanctn converToInfrmlSanctnObject(CtsnnManage ctsnnManage) throws Exception{
		InfrmlSanctn infrmlSanctn = new InfrmlSanctn();
    	infrmlSanctn.setJobSeCode("001");								// ?낅Т援щ텇肄붾뱶 (怨듯넻肄붾뱶 COM75)
    	infrmlSanctn.setApplcntId(ctsnnManage.getUsid());			    // ?ъ슜?륤D
    	infrmlSanctn.setReqstDe(ctsnnManage.getReqstDe());				// ?좎껌?쇱옄
    	infrmlSanctn.setSanctnerId(ctsnnManage.getSanctnerId());		// 寃곗옱?륤D
    	infrmlSanctn.setConfmAt(ctsnnManage.getConfmAt());				// ?뱀씤援щ텇
    	infrmlSanctn.setSanctnDt(ctsnnManage.getSanctnDt());			// 寃곗옱?쇱떆
    	infrmlSanctn.setReturnResn(ctsnnManage.getReturnResn());		// 諛섎젮?ъ쑀
    	infrmlSanctn.setFrstRegisterId(ctsnnManage.getFrstRegisterId());
    	ctsnnManage.setFrstRegisterPnttm(ctsnnManage.getFrstRegisterId());
    	infrmlSanctn.setLastUpdusrId(ctsnnManage.getLastUpdusrId());
    	infrmlSanctn.setLastUpdusrPnttm(ctsnnManage.getLastUpdusrPnttm());
    	infrmlSanctn.setInfrmlSanctnId(ctsnnManage.getInfrmlSanctnId());// ?쎌떇寃곗옱ID
    	return infrmlSanctn;
	}

}
