package egovframework.com.uss.olp.qtm.service.impl;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.uss.olp.qtm.service.EgovQustnrTmplatManageService;
import egovframework.com.uss.olp.qtm.service.QustnrTmplatManageVO;
import jakarta.annotation.Resource;

/**
 * ?ㅻЦ?쒗뵆由?ServiceImpl Class 援ы쁽
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
@Service("egovQustnrTmplatManageService")
public class EgovQustnrTmplatManageServiceImpl extends EgovAbstractServiceImpl implements EgovQustnrTmplatManageService{

	//final private Log log = LogFactory.getLog(this.getClass());

	@Resource(name="qustnrTmplatManageDao")
	private QustnrTmplatManageDao dao;

	@Resource(name="egovQustnrTmplatManageIdGnrService")
	private EgovIdGnrService idgenService;

    /**
	 * ?쒗뵆由욱뙆?쇰챸??議고쉶?쒕떎.
	 * @param qustnrTmplatManageVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	@Override
	public Map<?,?> selectQustnrTmplatManageTmplatImagepathnm(QustnrTmplatManageVO qustnrTmplatManageVO) throws Exception{
		//System.out.println("EgovQustnrTmplatManageServiceImpl QestnrTmplatId >>> "+ qustnrTmplatManageVO.getQestnrTmplatId());

		return dao.selectQustnrTmplatManageTmplatImagepathnm(qustnrTmplatManageVO);
	}

    /**
	 * ?ㅻЦ?쒗뵆由?紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	@Override
	public List<EgovMap> selectQustnrTmplatManageList(ComDefaultVO searchVO) throws Exception{
		return dao.selectQustnrTmplatManageList(searchVO);
	}

    /**
	 * ?ㅻЦ?쒗뵆由용?(?? ?곸꽭議고쉶 ?쒕떎.
	 * @param QustnrTmplatManage - ?뚯젙?뺣낫媛 ?닿? VO
	 * @return List
	 * @throws Exception
	 */
	@Override
	public List<EgovMap> selectQustnrTmplatManageDetail(QustnrTmplatManageVO qustnrTmplatManageVO) throws Exception{
		return dao.selectQustnrTmplatManageDetail(qustnrTmplatManageVO);
	}

    /**
	 * ?ㅻЦ?쒗뵆由용?(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return int
	 * @throws Exception
	 */
	@Override
	public int selectQustnrTmplatManageListCnt(ComDefaultVO searchVO) throws Exception{
		return dao.selectQustnrTmplatManageListCnt(searchVO);
	}

    /**
	 * ?ㅻЦ?쒗뵆由용?(?? ?깅줉?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	@Override
	public void insertQustnrTmplatManage(QustnrTmplatManageVO qustnrTmplatManageVO) throws Exception {
		String sMakeId = idgenService.getNextStringId();

		qustnrTmplatManageVO.setQestnrTmplatId(sMakeId);

		dao.insertQustnrTmplatManage(qustnrTmplatManageVO);
	}

    /**
	 * ?ㅻЦ?쒗뵆由용?(?? ?섏젙?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	@Override
	public void updateQustnrTmplatManage(QustnrTmplatManageVO qustnrTmplatManageVO){
		dao.updateQustnrTmplatManage(qustnrTmplatManageVO);
	}

    /**
	 * ?ㅻЦ?쒗뵆由용?(?? ??젣?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	@Override
	public void deleteQustnrTmplatManage(QustnrTmplatManageVO qustnrTmplatManageVO){
		dao.deleteQustnrTmplatManage(qustnrTmplatManageVO);
	}
}
