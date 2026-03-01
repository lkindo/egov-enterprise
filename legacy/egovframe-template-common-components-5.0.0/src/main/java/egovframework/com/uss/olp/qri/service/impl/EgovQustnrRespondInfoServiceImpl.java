package egovframework.com.uss.olp.qri.service.impl;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.uss.olp.qri.service.EgovQustnrRespondInfoService;
import egovframework.com.uss.olp.qri.service.QustnrRespondInfoVO;
import jakarta.annotation.Resource;

/**
 * ?ㅻЦ議곗궗 ServiceImpl Class 援ы쁽
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
@Service("egovQustnrRespondInfoService")
public class EgovQustnrRespondInfoServiceImpl extends EgovAbstractServiceImpl implements EgovQustnrRespondInfoService{

	//
                     private Log log = LogFactory.getLog(this.getClass());

	@Resource(name="qustnrRespondInfoDao")
	private QustnrRespondInfoDao dao;

	@Resource(name="qustnrRespondInfoIdGnrService")
	private EgovIdGnrService idgenService;


    /**
	 * ?ㅻЦ?쒗뵆由우쓣 議고쉶?쒕떎.
	 * @param map - 議고쉶???뺣낫媛 ?닿릿 map
	 * @return List
	 * @throws Exception
	 */
	@Override
	public List<?> selectQustnrTmplatManage(Map<?, ?> map) throws Exception{
		return dao.selectQustnrTmplatManage(map);
	}

	/**
	 * 媛앷????듦퀎瑜?議고쉶 議고쉶?쒕떎.
	 *
	 * @param map - 議고쉶???뺣낫媛 ?닿릿 map
	 * @return List
	 * @throws Exception
	 */
	@Override
	public List<EgovMap> selectQustnrRespondInfoManageStatistics1(Map<?, ?> map) throws Exception {
		return dao.selectQustnrRespondInfoManageStatistics1(map);
	}

	/**
     * 二쇨????듦퀎瑜?議고쉶 議고쉶?쒕떎.
     *
     * @param map - 議고쉶???뺣낫媛 ?닿릿 map
     * @return List
     * @throws Exception
     */
    @Override
    public List<EgovMap> selectQustnrRespondInfoManageStatistics2(Map<?, ?> map) throws Exception {
        return dao.selectQustnrRespondInfoManageStatistics2(map);
    }

    /**
	 * ?뚯썝?뺣낫瑜?議고쉶?쒕떎.
	 * @param map - 議고쉶???뺣낫媛 ?닿릿 map
	 * @return List
	 * @throws Exception
	 */
	@Override
	public Map<?, ?> selectQustnrRespondInfoManageEmplyrinfo(Map<?, ?> map) throws Exception{
		return dao.selectQustnrRespondInfoManageEmplyrinfo(map);
	}

    /**
     * ?ㅻЦ?뺣낫瑜?議고쉶?쒕떎.
     *
     * @param map - 議고쉶???뺣낫媛 ?닿릿 map
     * @return List
     * @throws Exception
     */
    @Override
    public List<EgovMap> selectQustnrRespondInfoManageComtnqestnrinfo(Map<?, ?> map) throws Exception {
        return dao.selectQustnrRespondInfoManageComtnqestnrinfo(map);
    }

    /**
     * 臾명빆?뺣낫瑜?議고쉶?쒕떎.
     *
     * @param map - 議고쉶???뺣낫媛 ?닿릿 map
     * @return List
     * @throws Exception
     */
    @Override
    public List<EgovMap> selectQustnrRespondInfoManageComtnqustnrqesitm(Map<?, ?> map) throws Exception {
        return dao.selectQustnrRespondInfoManageComtnqustnrqesitm(map);
    }

    /**
     * ??ぉ?뺣낫瑜?議고쉶?쒕떎.
     *
     * @param map - 議고쉶???뺣낫媛 ?닿릿 map
     * @return List
     * @throws Exception
     */
    @Override
    public List<EgovMap> selectQustnrRespondInfoManageComtnqustnriem(Map<?, ?> map) throws Exception {
        return dao.selectQustnrRespondInfoManageComtnqustnriem(map);
    }

    /**
     * ?ㅻЦ議곗궗(?ㅻЦ?깅줉)瑜??? 紐⑸줉??議고쉶?쒕떎.
     *
     * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
     * @return List
     * @throws Exception
     */
    @Override
    public List<EgovMap> selectQustnrRespondInfoManageList(ComDefaultVO searchVO){
        return dao.selectQustnrRespondInfoManageList(searchVO);
    }

    /**
	 * ?ㅻЦ議곗궗(?ㅻЦ?깅줉)瑜??? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return
	 * @throws Exception
	 */
	@Override
	public int selectQustnrRespondInfoManageListCnt(ComDefaultVO searchVO) throws Exception{
		return dao.selectQustnrRespondInfoManageListCnt(searchVO);
	}

    /**
     * ?묐떟?먭껐怨??ㅻЦ議곗궗) 紐⑸줉??議고쉶?쒕떎.
     *
     * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
     * @return List
     * @throws Exception
     */
    @Override
    public List<EgovMap> selectQustnrRespondInfoList(ComDefaultVO searchVO) throws Exception {
        return dao.selectQustnrRespondInfoList(searchVO);
    }

    /**
     * ?묐떟?먭껐怨??ㅻЦ議곗궗)瑜??? ?곸꽭議고쉶 ?쒕떎.
     *
     * @param QustnrRespondInfo - ?뚯젙?뺣낫媛 ?닿? VO
     * @return List
     * @throws Exception
     */
    @Override
    public List<EgovMap> selectQustnrRespondInfoDetail(QustnrRespondInfoVO qustnrRespondInfoVO) throws Exception {
        return dao.selectQustnrRespondInfoDetail(qustnrRespondInfoVO);
    }

    /**
	 * ?묐떟?먭껐怨??ㅻЦ議곗궗)瑜??? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return int
	 * @throws Exception
	 */
	@Override
	public int selectQustnrRespondInfoListCnt(ComDefaultVO searchVO) throws Exception{
		return dao.selectQustnrRespondInfoListCnt(searchVO);
	}

    /**
	 * ?묐떟?먭껐怨??ㅻЦ議곗궗)瑜??? ?깅줉?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	@Override
	public void insertQustnrRespondInfo(QustnrRespondInfoVO qustnrRespondInfoVO) throws Exception {
		String sMakeId = idgenService.getNextStringId();

		qustnrRespondInfoVO.setQestnrQesrspnsId(sMakeId);

		dao.insertQustnrRespondInfo(qustnrRespondInfoVO);
	}

    /**
	 * ?묐떟?먭껐怨??ㅻЦ議곗궗)瑜??? ?섏젙?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	@Override
	public void updateQustnrRespondInfo(QustnrRespondInfoVO qustnrRespondInfoVO) throws Exception{
		dao.updateQustnrRespondInfo(qustnrRespondInfoVO);
	}

    /**
	 * ?묐떟?먭껐怨??ㅻЦ議곗궗)瑜??? ??젣?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	@Override
	public void deleteQustnrRespondInfo(QustnrRespondInfoVO qustnrRespondInfoVO) throws Exception{
		dao.deleteQustnrRespondInfo(qustnrRespondInfoVO);
	}

    /**
     * ?ㅻЦ?쒗뵆由우쓣 議고쉶?쒕떎.
     *
     * @param map - 議고쉶???뺣낫媛 ?닿릿 map
     * @return List
     * @throws Exception
     */
    @Override
    public List<EgovMap> selectQustnrTmplatWhiteList() throws Exception {
        return dao.selectQustnrTmplatWhiteList();
    }

}
