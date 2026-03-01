package egovframework.com.cop.smt.dsm.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cop.smt.dsm.service.DiaryManageVO;
import egovframework.com.cop.smt.dsm.service.EgovDiaryManageService;
import jakarta.annotation.Resource;
/**
 * ?쇱?愿由щ? 泥섎━?섎뒗 ServiceImpl Class 援ы쁽
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2009.04.10
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.04.10  ?λ룞??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@Service("egovDiaryManageService")
public class EgovDiaryManageServiceImpl extends EgovAbstractServiceImpl implements EgovDiaryManageService{

	//
                     private Log log = LogFactory.getLog(this.getClass());

	@Resource(name="diaryManageDao")
	private DiaryManageDao dao;


	@Resource(name="diaryManageIdGnrService")
	private EgovIdGnrService idgenService;

    /**
	 * ?쇱?愿由?紐⑸줉瑜??? 議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	@Override
	public List<EgovMap> selectDiaryManageList(ComDefaultVO searchVO) throws Exception{
		return dao.selectDiaryManageList(searchVO);
	}

    /**
	 * ?쇱?愿由щ?(?? ?곸꽭議고쉶 ?쒕떎.
	 * @param DiaryManage - ?뚯젙?뺣낫媛 ?닿? VO
	 * @return List
	 * @throws Exception
	 */
	@Override
	public DiaryManageVO selectDiaryManageDetail(DiaryManageVO diaryManageVO) throws Exception{
		return dao.selectDiaryManageDetail(diaryManageVO);
	}

    /**
	 * ?쇱?愿由щ?(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return int
	 * @throws Exception
	 */
	@Override
	public int selectDiaryManageListCnt(ComDefaultVO searchVO) throws Exception{
		return dao.selectDiaryManageListCnt(searchVO);
	}

    /**
	 * ?쇱?愿由щ?(?? ?깅줉?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	@Override
	public void insertDiaryManage(DiaryManageVO diaryManageVO) throws Exception {
		String sMakeId = idgenService.getNextStringId();

		diaryManageVO.setDiaryId(sMakeId);

		dao.insertDiaryManage(diaryManageVO);
	}

    /**
	 * ?쇱?愿由щ?(?? ?섏젙?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	@Override
	public void updateDiaryManage(DiaryManageVO diaryManageVO) throws Exception{
		dao.updateDiaryManage(diaryManageVO);
	}

    /**
	 * ?쇱?愿由щ?(?? ??젣?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	@Override
	public void deleteDiaryManage(DiaryManageVO diaryManageVO) throws Exception{
		dao.deleteDiaryManage(diaryManageVO);
	}
}
