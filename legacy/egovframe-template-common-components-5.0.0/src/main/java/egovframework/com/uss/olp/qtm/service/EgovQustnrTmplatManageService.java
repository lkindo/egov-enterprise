package egovframework.com.uss.olp.qtm.service;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

import egovframework.com.cmm.ComDefaultVO;

/**
 * ?ㅻЦ?쒗뵆由?Service Class 援ы쁽
 * 
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2009.03.20
 * @version 1.0
 * @see
 *
 *      <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  ?λ룞??         理쒖큹 ?앹꽦
 *
 *      </pre>
 */
public interface EgovQustnrTmplatManageService {

	/**
	 * ?쒗뵆由욱뙆?쇰챸??議고쉶?쒕떎.
	 * 
	 * @param qustnrTmplatManageVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	public Map<?, ?> selectQustnrTmplatManageTmplatImagepathnm(QustnrTmplatManageVO qustnrTmplatManageVO)
			throws Exception;

	/**
	 * ?ㅻЦ?쒗뵆由?紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectQustnrTmplatManageList(ComDefaultVO searchVO) throws Exception;

	/**
	 * ?ㅻЦ?쒗뵆由용?(?? ?곸꽭議고쉶 ?쒕떎.
	 * 
	 * @param QustnrTmplatManage - ?뚯젙?뺣낫媛 ?닿? VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectQustnrTmplatManageDetail(QustnrTmplatManageVO qustnrTmplatManageVO) throws Exception;

	/**
	 * ?ㅻЦ?쒗뵆由용?(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * 
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return int
	 * @throws Exception
	 */
	public int selectQustnrTmplatManageListCnt(ComDefaultVO searchVO) throws Exception;

	/**
	 * ?ㅻЦ?쒗뵆由용?(?? ?깅줉?쒕떎.
	 * 
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	void insertQustnrTmplatManage(QustnrTmplatManageVO qustnrTmplatManageVO) throws Exception;

	/**
	 * ?ㅻЦ?쒗뵆由용?(?? ?섏젙?쒕떎.
	 * 
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	void updateQustnrTmplatManage(QustnrTmplatManageVO qustnrTmplatManageVO) throws Exception;

	/**
	 * ?ㅻЦ?쒗뵆由용?(?? ??젣?쒕떎.
	 * 
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	void deleteQustnrTmplatManage(QustnrTmplatManageVO qustnrTmplatManageVO) throws Exception;

}
