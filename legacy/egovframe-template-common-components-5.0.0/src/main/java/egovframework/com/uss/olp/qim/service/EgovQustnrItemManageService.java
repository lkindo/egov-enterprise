package egovframework.com.uss.olp.qim.service;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

import egovframework.com.cmm.ComDefaultVO;
/**
 * ?ㅻЦ??ぉ愿由щ? 泥섎━?섎뒗 Service Class 援ы쁽
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
public interface EgovQustnrItemManageService {

    /**
	 * ?ㅻЦ?쒗뵆由???瑜? 紐⑸줉??議고쉶?쒕떎.
	 * @param qustnrItemManageVO - ?ㅻЦ??ぉ ?뺣낫 ?닿? VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectQustnrTmplatManageList(QustnrItemManageVO qustnrItemManageVO) throws Exception;

    /**
	 * ?ㅻЦ??ぉ 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectQustnrItemManageList(ComDefaultVO searchVO) throws Exception;

    /**
	 * ?ㅻЦ??ぉ瑜??? ?곸꽭議고쉶 ?쒕떎.
	 * @param qustnrItemManageVO - ?ㅻЦ??ぉ ?뺣낫 ?닿? VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectQustnrItemManageDetail(QustnrItemManageVO qustnrItemManageVO) throws Exception;

    /**
	 * ?ㅻЦ??ぉ瑜??? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return int
	 * @throws Exception
	 */
	public int selectQustnrItemManageListCnt(ComDefaultVO searchVO) throws Exception;

    /**
	 * ?ㅻЦ??ぉ瑜??? ?깅줉?쒕떎.
	 * @param qustnrItemManageVO - ?ㅻЦ??ぉ ?뺣낫 ?닿? VO
	 * @throws Exception
	 */
	void  insertQustnrItemManage(QustnrItemManageVO qustnrItemManageVO) throws Exception;

    /**
	 * ?ㅻЦ??ぉ瑜??? ?섏젙?쒕떎.
	 * @param qustnrItemManageVO - ?ㅻЦ??ぉ ?뺣낫 ?닿? VO
	 * @throws Exception
	 */
	void  updateQustnrItemManage(QustnrItemManageVO qustnrItemManageVO) throws Exception;

    /**
	 * ?ㅻЦ??ぉ瑜??? ??젣?쒕떎.
	 * @param qustnrItemManageVO - ?ㅻЦ??ぉ ?뺣낫 ?닿? VO
	 * @throws Exception
	 */
	void  deleteQustnrItemManage(QustnrItemManageVO qustnrItemManageVO) throws Exception;


}
