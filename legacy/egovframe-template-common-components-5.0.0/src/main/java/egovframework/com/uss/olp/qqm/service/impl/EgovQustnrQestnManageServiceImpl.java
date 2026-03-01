package egovframework.com.uss.olp.qqm.service.impl;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.uss.olp.qqm.service.EgovQustnrQestnManageService;
import egovframework.com.uss.olp.qqm.service.QustnrQestnManageVO;
import jakarta.annotation.Resource;

/**
 * ?ㅻЦ臾명빆??泥섎━?섎뒗 ServiceImpl Class 援ы쁽
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
@Service("egovQustnrQestnManageService")
public class EgovQustnrQestnManageServiceImpl extends EgovAbstractServiceImpl implements EgovQustnrQestnManageService{

	//
                     private Log log = LogFactory.getLog(this.getClass());

	@Resource(name="qustnrQestnManageDao")
	private QustnrQestnManageDao dao;

	@Resource(name="egovQustnrQestnManageIdGnrService")
	private EgovIdGnrService idgenService;


    /**
	 * ?ㅻЦ議곗궗 ?묐떟?먮떟蹂?댁슜寃곌낵/湲고??듬??댁슜寃곌낵 ?듦퀎瑜?議고쉶?쒕떎.
	 * @param Map - ?ㅻЦ吏 ?뺣낫媛 ?닿? Parameter
	 * @return Map
	 * @throws Exception
	 */
	@Override
	public List<EgovMap> selectQustnrManageStatistics2(Map<?, ?> map) throws Exception{
		return dao.selectQustnrManageStatistics2(map);
	}

    /**
	 * ?ㅻЦ議곗궗 ?듦퀎瑜?議고쉶?쒕떎.
	 * @param Map - ?ㅻЦ吏 ?뺣낫媛 ?닿? Parameter
	 * @return Map
	 * @throws Exception
	 */
	@Override
	public List<?> selectQustnrManageStatistics(Map<?, ?> map) throws Exception{
		return dao.selectQustnrManageStatistics(map);
	}
    /**
	 * ?ㅻЦ吏?뺣낫 ?ㅻЦ?쒕ぉ??議고쉶?쒕떎.
	 * @param Map - ?ㅻЦ吏 ?뺣낫媛 ?닿? Parameter
	 * @return Map
	 * @throws Exception
	 */
	@Override
	public Map<?, ?> selectQustnrManageQestnrSj(Map<?, ?> map) throws Exception{
		return dao.selectQustnrManageQestnrSj(map);
	}

    /**
	 * ?ㅻЦ臾명빆 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	@Override
	public List<?> selectQustnrQestnManageList(ComDefaultVO searchVO) throws Exception{
		return dao.selectQustnrQestnManageList(searchVO);
	}

    /**
	 * ?ㅻЦ臾명빆瑜??? ?곸꽭議고쉶 ?쒕떎.
	 * @param QustnrQestnManage - ?뚯젙?뺣낫媛 ?닿? VO
	 * @return List
	 * @throws Exception
	 */
	@Override
	public List<EgovMap> selectQustnrQestnManageDetail(QustnrQestnManageVO qustnrQestnManageVO) throws Exception{
		return dao.selectQustnrQestnManageDetail(qustnrQestnManageVO);
	}

    /**
	 * ?ㅻЦ臾명빆瑜??? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return int
	 * @throws Exception
	 */
	@Override
	public int selectQustnrQestnManageListCnt(ComDefaultVO searchVO) throws Exception{
		return dao.selectQustnrQestnManageListCnt(searchVO);
	}

    /**
	 * ?ㅻЦ臾명빆瑜??? ?깅줉?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	@Override
	public void insertQustnrQestnManage(QustnrQestnManageVO qustnrQestnManageVO) throws Exception {
		String sMakeId = idgenService.getNextStringId();

		qustnrQestnManageVO.setQestnrQesitmId(sMakeId);

		dao.insertQustnrQestnManage(qustnrQestnManageVO);
	}

    /**
	 * ?ㅻЦ臾명빆瑜??? ?섏젙?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	@Override
	public void updateQustnrQestnManage(QustnrQestnManageVO qustnrQestnManageVO) throws Exception{
		dao.updateQustnrQestnManage(qustnrQestnManageVO);
	}

    /**
	 * ?ㅻЦ臾명빆瑜??? ??젣?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	@Override
	public void deleteQustnrQestnManage(QustnrQestnManageVO qustnrQestnManageVO) throws Exception{
		dao.deleteQustnrQestnManage(qustnrQestnManageVO);
	}
}
