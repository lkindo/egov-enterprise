package egovframework.com.cop.smt.dsm.service.impl;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Repository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.cop.smt.dsm.service.DiaryManageVO;
/**
 * ?쇱?愿由щ? 泥섎━?섎뒗 Dao Class 援ы쁽
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
@Repository("diaryManageDao")
public class DiaryManageDao extends EgovComAbstractDAO {
	
    /**
	 * ?쇱?愿由?紐⑸줉??議고쉶?쒕떎. 
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectDiaryManageList(ComDefaultVO searchVO) throws Exception{
		return selectList("DiaryManage.selectDiaryManage", searchVO);
	}
	
    /**
	 * ?쇱?愿由щ?(?? ?곸꽭議고쉶 ?쒕떎.
	 * @param diaryManageVO - ?쇱?愿由??뺣낫 ?닿? VO
	 * @return List
	 * @throws Exception
	 */
	public DiaryManageVO selectDiaryManageDetail(DiaryManageVO diaryManageVO) throws Exception{
		return (DiaryManageVO)selectOne("DiaryManage.selectDiaryManageDetail", diaryManageVO);
	}

    /**
	 * ?쇱?愿由щ?(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return int
	 * @throws Exception
	 */
	public int selectDiaryManageListCnt(ComDefaultVO searchVO) throws Exception{
		return (Integer)selectOne("DiaryManage.selectDiaryManageCnt", searchVO);
	}
	
    /**
	 * ?쇱?愿由щ?(?? ?깅줉?쒕떎.
	 * @param qdiaryManageVO - ?쇱?愿由??뺣낫 ?닿? VO
	 * @throws Exception
	 */
	public void insertDiaryManage(DiaryManageVO diaryManageVO) throws Exception{
		insert("DiaryManage.insertDiaryManage", diaryManageVO);
	}

    /**
	 * ?쇱?愿由щ?(?? ?섏젙?쒕떎.
	 * @param diaryManageVO - ?쇱?愿由??뺣낫 ?닿? VO
	 * @throws Exception
	 */
	public void updateDiaryManage(DiaryManageVO diaryManageVO) throws Exception{
		insert("DiaryManage.updateDiaryManage", diaryManageVO);
	}
	
    /**
	 * ?쇱?愿由щ?(?? ??젣?쒕떎.
	 * @param diaryManageVO - ?쇱?愿由??뺣낫 ?닿? VO
	 * @return 
	 * @throws Exception
	 */
	public void deleteDiaryManage(DiaryManageVO diaryManageVO) throws Exception{
		insert("DiaryManage.deleteDiaryManage", diaryManageVO);
	}
}
