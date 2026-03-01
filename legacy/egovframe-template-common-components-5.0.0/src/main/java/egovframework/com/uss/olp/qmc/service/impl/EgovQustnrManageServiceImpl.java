package egovframework.com.uss.olp.qmc.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.uss.olp.qmc.service.EgovQustnrManageService;
import egovframework.com.uss.olp.qmc.service.QustnrManageVO;
import jakarta.annotation.Resource;
/**
 * ?ㅻЦ愿由щ? 泥섎━?섎뒗 ServiceImpl Class 援ы쁽
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
@Service("egovQustnrManageService")
public class EgovQustnrManageServiceImpl extends EgovAbstractServiceImpl implements EgovQustnrManageService{

	//
                     private Log log = LogFactory.getLog(this.getClass());

	@Resource(name="qustnrManageDao")
	private QustnrManageDao dao;

	@Resource(name="egovQustnrManageIdGnrService")
	private EgovIdGnrService idgenService;


    /**
	 * ?ㅻЦ?쒗뵆由?紐⑸줉??議고쉶?쒕떎.
	 * @param qustnrManageVO - ?ㅻЦ愿由??뺣낫 ?닿? VO
	 * @return List
	 * @throws Exception
	 */
	@Override
	public List<EgovMap> selectQustnrTmplatManageList(QustnrManageVO qustnrManageVO) throws Exception{
		return dao.selectQustnrTmplatManageList(qustnrManageVO);
	}


    /**
	 * ?ㅻЦ愿由?紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	@Override
	public List<EgovMap> selectQustnrManageList(ComDefaultVO searchVO) throws Exception{
		return dao.selectQustnrManageList(searchVO);
	}

    /**
	 * ?ㅻЦ愿由щ? ?곸꽭議고쉶(Model) ?쒕떎.
	 * @param qustnrManageVO - ?ㅻЦ愿由??뺣낫 ?닿? VO
	 * @return List
	 * @throws Exception
	 */
    @Override
	public QustnrManageVO selectQustnrManageDetailModel(QustnrManageVO qustnrManageVO) throws Exception {
        return dao.selectQustnrManageDetailModel(qustnrManageVO);
    }

    /**
	 * ?ㅻЦ愿由щ?(?? ?곸꽭議고쉶 ?쒕떎.
	 * @param QustnrManage - ?뚯젙?뺣낫媛 ?닿? VO
	 * @return List
	 * @throws Exception
	 */
	@Override
	public List<EgovMap> selectQustnrManageDetail(QustnrManageVO qustnrManageVO) throws Exception{
		return dao.selectQustnrManageDetail(qustnrManageVO);
	}

    /**
	 * ?ㅻЦ愿由щ?(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return int
	 * @throws Exception
	 */
	@Override
	public int selectQustnrManageListCnt(ComDefaultVO searchVO) throws Exception{
		return dao.selectQustnrManageListCnt(searchVO);
	}

    /**
	 * ?ㅻЦ愿由щ?(?? ?깅줉?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	@Override
	public void insertQustnrManage(QustnrManageVO qustnrManageVO) throws Exception {
		String sMakeId = idgenService.getNextStringId();

		qustnrManageVO.setQestnrId(sMakeId);

		dao.insertQustnrManage(qustnrManageVO);
	}

    /**
	 * ?ㅻЦ愿由щ?(?? ?섏젙?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	@Override
	public void updateQustnrManage(QustnrManageVO qustnrManageVO) throws Exception{
		dao.updateQustnrManage(qustnrManageVO);
	}

    /**
	 * ?ㅻЦ愿由щ?(?? ??젣?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	@Override
	public void deleteQustnrManage(QustnrManageVO qustnrManageVO) throws Exception{
		dao.deleteQustnrManage(qustnrManageVO);
	}
}
