package egovframework.com.uss.olp.qrm.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.uss.olp.qrm.service.EgovQustnrRespondManageService;
import egovframework.com.uss.olp.qrm.service.QustnrRespondManageVO;
import jakarta.annotation.Resource;
/**
 * ?ㅻЦ?묐떟?먭?由?ServiceImpl Class 援ы쁽
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
@Service("egovQustnrRespondManageService")
public class EgovQustnrRespondManageServiceImpl extends EgovAbstractServiceImpl implements EgovQustnrRespondManageService{

	//
                     private Log log = LogFactory.getLog(this.getClass());

	@Resource(name="qustnrRespondManageDao")
	private QustnrRespondManageDao dao;


	@Resource(name="qustnrRespondManageIdGnrService")
	private EgovIdGnrService idgenService;

    /**
	 * ?묐떟?먯젙蹂?紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	@Override
	public List<EgovMap> selectQustnrRespondManageList(ComDefaultVO searchVO) throws Exception{
		return dao.selectQustnrRespondManageList(searchVO);
	}

    /**
	 * ?묐떟?먯젙蹂대?(?? ?곸꽭議고쉶 ?쒕떎.
	 * @param QustnrRespondManage - ?뚯젙?뺣낫媛 ?닿? VO
	 * @return List
	 * @throws Exception
	 */
	@Override
	public List<EgovMap> selectQustnrRespondManageDetail(QustnrRespondManageVO qustnrRespondManageVO) throws Exception{
		return dao.selectQustnrRespondManageDetail(qustnrRespondManageVO);
	}

    /**
	 * ?묐떟?먯젙蹂대?(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return int
	 * @throws Exception
	 */
	@Override
	public int selectQustnrRespondManageListCnt(ComDefaultVO searchVO) throws Exception{
		return dao.selectQustnrRespondManageListCnt(searchVO);
	}

    /**
	 * ?묐떟?먯젙蹂대?(?? ?깅줉?쒕떎.
	 * @param qustnrRespondManageVO -  ?묐떟?먯젙蹂??뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	@Override
	public void insertQustnrRespondManage(QustnrRespondManageVO qustnrRespondManageVO) throws Exception {
		String sMakeId = idgenService.getNextStringId();

		qustnrRespondManageVO.setQestnrRespondId(sMakeId);

		dao.insertQustnrRespondManage(qustnrRespondManageVO);
	}

    /**
	 * ?묐떟?먯젙蹂대?(?? ?섏젙?쒕떎.
	 * @param qustnrRespondManageVO - ?묐떟?먯젙蹂?議고쉶???뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	@Override
	public void updateQustnrRespondManage(QustnrRespondManageVO qustnrRespondManageVO) throws Exception{
		dao.updateQustnrRespondManage(qustnrRespondManageVO);
	}

    /**
	 * ?묐떟?먯젙蹂대?(?? ??젣?쒕떎.
	 * @param qustnrRespondManageVO - ?묐떟?먯젙蹂??뺣낫媛 ?닿릿 VO
	 * @return
	 * @throws Exception
	 */
	@Override
	public void deleteQustnrRespondManage(QustnrRespondManageVO qustnrRespondManageVO) throws Exception{
		dao.deleteQustnrRespondManage(qustnrRespondManageVO);
	}
}
