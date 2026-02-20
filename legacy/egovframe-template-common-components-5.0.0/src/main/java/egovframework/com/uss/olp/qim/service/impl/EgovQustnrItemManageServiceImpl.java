package egovframework.com.uss.olp.qim.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.uss.olp.qim.service.EgovQustnrItemManageService;
import egovframework.com.uss.olp.qim.service.QustnrItemManageVO;
import jakarta.annotation.Resource;
/**
 * ?ㅻЦ??ぉ愿由щ? 泥섎━?섎뒗 ServiceImpl Class 援ы쁽
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2009.03.20
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  ?λ룞??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@Service("egovQustnrItemManageService")
public class EgovQustnrItemManageServiceImpl extends EgovAbstractServiceImpl implements EgovQustnrItemManageService{

	//final private Log log = LogFactory.getLog(this.getClass());

	@Resource(name="qustnrItemManageDao")
	private QustnrItemManageDao dao;

	@Resource(name="egovQustnrItemManageIdGnrService")
	private EgovIdGnrService idgenService;

    /**
	 * ?ㅻЦ?쒗뵆由???瑜? 紐⑸줉??議고쉶?쒕떎.
	 * @param qustnrItemManageVO - ?ㅻЦ??ぉ ?뺣낫 ?닿? VO
	 * @return List
	 * @throws Exception
	 */
	@Override
	public List<EgovMap> selectQustnrTmplatManageList(QustnrItemManageVO qustnrItemManageVO) throws Exception{
		return dao.selectQustnrTmplatManageList(qustnrItemManageVO);
	}


    /**
	 * ?ㅻЦ??ぉ 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	@Override
	public List<EgovMap> selectQustnrItemManageList(ComDefaultVO searchVO) throws Exception{
		return dao.selectQustnrItemManageList(searchVO);
	}

    /**
	 * ?ㅻЦ??ぉ瑜??? ?곸꽭議고쉶 ?쒕떎.
	 * @param QustnrItemManage - ?뚯젙?뺣낫媛 ?닿? VO
	 * @return List
	 * @throws Exception
	 */
	@Override
	public List<EgovMap> selectQustnrItemManageDetail(QustnrItemManageVO qustnrItemManageVO) throws Exception{
		return dao.selectQustnrItemManageDetail(qustnrItemManageVO);
	}

    /**
	 * ?ㅻЦ??ぉ瑜??? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return int
	 * @throws Exception
	 */
	@Override
	public int selectQustnrItemManageListCnt(ComDefaultVO searchVO) throws Exception{
		return dao.selectQustnrItemManageListCnt(searchVO);
	}

    /**
	 * ?ㅻЦ??ぉ瑜??? ?깅줉?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	@Override
	public void insertQustnrItemManage(QustnrItemManageVO qustnrItemManageVO) throws Exception {
		String sMakeId = idgenService.getNextStringId();

		qustnrItemManageVO.setQustnrIemId(sMakeId);

		dao.insertQustnrItemManage(qustnrItemManageVO);
	}

    /**
	 * ?ㅻЦ??ぉ瑜??? ?섏젙?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	@Override
	public void updateQustnrItemManage(QustnrItemManageVO qustnrItemManageVO) throws Exception{
		dao.updateQustnrItemManage(qustnrItemManageVO);
	}

    /**
	 * ?ㅻЦ??ぉ瑜??? ??젣?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	@Override
	public void deleteQustnrItemManage(QustnrItemManageVO qustnrItemManageVO) throws Exception{
		dao.deleteQustnrItemManage(qustnrItemManageVO);
	}
}
