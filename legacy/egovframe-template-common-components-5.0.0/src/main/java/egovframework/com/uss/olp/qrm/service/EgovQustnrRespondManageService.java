package egovframework.com.uss.olp.qrm.service;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

import egovframework.com.cmm.ComDefaultVO;
/**
 * ?ㅻЦ?묐떟?먭?由?Service Class 援ы쁽
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
public interface EgovQustnrRespondManageService {

    /**
	 * ?묐떟?먯젙蹂?紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectQustnrRespondManageList(ComDefaultVO searchVO) throws Exception;

    /**
	 * ?묐떟?먯젙蹂대?(?? ?곸꽭議고쉶 ?쒕떎.
	 * @param qustnrRespondManageVO - ?묐떟?먯젙蹂??뺣낫 ?닿? VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectQustnrRespondManageDetail(QustnrRespondManageVO qustnrRespondManageVO) throws Exception;

    /**
	 * ?묐떟?먯젙蹂대?(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return int
	 * @throws Exception
	 */
	public int selectQustnrRespondManageListCnt(ComDefaultVO searchVO) throws Exception;

    /**
	 * ?묐떟?먯젙蹂대?(?? ?깅줉?쒕떎.
	 * @param qustnrRespondManageVO - ?묐떟?먯젙蹂??뺣낫 ?닿? VO
	 * @throws Exception
	 */
	void  insertQustnrRespondManage(QustnrRespondManageVO qustnrRespondManageVO) throws Exception;

    /**
	 * ?묐떟?먯젙蹂대?(?? ?섏젙?쒕떎.
	 * @param qustnrRespondManageVO - ?묐떟?먯젙蹂??뺣낫 ?닿? VO
	 * @throws Exception
	 */
	void  updateQustnrRespondManage(QustnrRespondManageVO qustnrRespondManageVO) throws Exception;

    /**
	 * ?묐떟?먯젙蹂대?(?? ??젣?쒕떎.
	 * @param qustnrRespondManageVO - ?묐떟?먯젙蹂??뺣낫 ?닿? VO
	 * @throws Exception
	 */
	void  deleteQustnrRespondManage(QustnrRespondManageVO qustnrRespondManageVO) throws Exception;


}
