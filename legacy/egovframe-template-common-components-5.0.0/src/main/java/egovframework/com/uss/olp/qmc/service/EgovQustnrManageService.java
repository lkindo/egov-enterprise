package egovframework.com.uss.olp.qmc.service;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

import egovframework.com.cmm.ComDefaultVO;
/**
 * ?ㅻЦ愿由щ? 泥섎━?섎뒗 Service Class 援ы쁽
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
public interface EgovQustnrManageService {

    /**
	 * ?ㅻЦ?쒗뵆由?紐⑸줉??議고쉶?쒕떎.
	 * @param qustnrManageVO - ?ㅻЦ愿由??뺣낫 ?닿? VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectQustnrTmplatManageList(QustnrManageVO qustnrManageVO) throws Exception;

    /**
	 * ?ㅻЦ愿由?紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectQustnrManageList(ComDefaultVO searchVO) throws Exception;

    /**
	 * ?ㅻЦ愿由щ?(?? ?곸꽭議고쉶 ?쒕떎.
	 * @param qustnrManageVO - ?ㅻЦ愿由??뺣낫 ?닿? VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectQustnrManageDetail(QustnrManageVO qustnrManageVO) throws Exception;

    /**
	 * ?ㅻЦ愿由щ? ?곸꽭議고쉶(Model) ?쒕떎.
	 * @param qustnrManageVO - ?ㅻЦ愿由??뺣낫 ?닿? VO
	 * @return List
	 * @throws Exception
	 */
    public QustnrManageVO selectQustnrManageDetailModel(QustnrManageVO qustnrManageVO) throws Exception ;

    /**
	 * ?ㅻЦ愿由щ?(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return int
	 * @throws Exception
	 */
	public int selectQustnrManageListCnt(ComDefaultVO searchVO) throws Exception;

    /**
	 * ?ㅻЦ愿由щ?(?? ?깅줉?쒕떎.
	 * @param qustnrManageVO - ?ㅻЦ愿由??뺣낫 ?닿? VO
	 * @throws Exception
	 */
	void  insertQustnrManage(QustnrManageVO qustnrManageVO) throws Exception;

    /**
	 * ?ㅻЦ愿由щ?(?? ?섏젙?쒕떎.
	 * @param qustnrManageVO - ?ㅻЦ愿由??뺣낫 ?닿? VO
	 * @throws Exception
	 */
	void  updateQustnrManage(QustnrManageVO qustnrManageVO) throws Exception;

    /**
	 * ?ㅻЦ愿由щ?(?? ??젣?쒕떎.
	 * @param qustnrManageVO - ?ㅻЦ愿由??뺣낫 ?닿? VO
	 * @throws Exception
	 */
	void  deleteQustnrManage(QustnrManageVO qustnrManageVO) throws Exception;


}
