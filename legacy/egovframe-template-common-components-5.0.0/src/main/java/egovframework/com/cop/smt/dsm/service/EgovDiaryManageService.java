package egovframework.com.cop.smt.dsm.service;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

import egovframework.com.cmm.ComDefaultVO;
/**
 * ?쇱?愿由щ? 泥섎━?섎뒗 Service Class 援ы쁽
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
public interface EgovDiaryManageService {
	
    /**
	 * ?쇱?愿由?紐⑸줉??議고쉶?쒕떎. 
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectDiaryManageList(ComDefaultVO searchVO) throws Exception;
	
    /**
	 * ?쇱?愿由щ?(?? ?곸꽭議고쉶 ?쒕떎.
	 * @param diaryManageVO - ?쇱?愿由??뺣낫 ?닿? VO
	 * @return DiaryManageVO
	 * @throws Exception
	 */
	public DiaryManageVO selectDiaryManageDetail(DiaryManageVO diaryManageVO) throws Exception;
	
    /**
	 * ?쇱?愿由щ?(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return int
	 * @throws Exception
	 */
	public int selectDiaryManageListCnt(ComDefaultVO searchVO) throws Exception;

    /**
	 * ?쇱?愿由щ?(?? ?깅줉?쒕떎.
	 * @param diaryManageVO - ?쇱?愿由??뺣낫 ?닿? VO
	 * @throws Exception
	 */
	void  insertDiaryManage(DiaryManageVO diaryManageVO) throws Exception;
	
    /**
	 * ?쇱?愿由щ?(?? ?섏젙?쒕떎.
	 * @param diaryManageVO - ?쇱?愿由??뺣낫 ?닿? VO 
	 * @throws Exception
	 */
	void  updateDiaryManage(DiaryManageVO diaryManageVO) throws Exception;
	
    /**
	 * ?쇱?愿由щ?(?? ??젣?쒕떎.
	 * @param diaryManageVO - ?쇱?愿由??뺣낫 ?닿? VO 
	 * @throws Exception
	 */
	void  deleteDiaryManage(DiaryManageVO diaryManageVO) throws Exception;
	
	
}
