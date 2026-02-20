package egovframework.com.uss.olp.qri.service;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

import egovframework.com.cmm.ComDefaultVO;
/**
 * ?ㅻЦ議곗궗 Service Class 援ы쁽
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
public interface EgovQustnrRespondInfoService {
	
    /**
	 * ?ㅻЦ?쒗뵆由우쓣 議고쉶?쒕떎.
	 * @param map - 議고쉶???뺣낫媛 ?닿릿 map
	 * @return List
	 * @throws Exception
	 */
	public List<?> selectQustnrTmplatManage(Map<?, ?> map) throws Exception;

	/**
	 * 媛앷????듦퀎瑜?議고쉶 議고쉶?쒕떎.
	 * 
	 * @param map - 議고쉶???뺣낫媛 ?닿릿 map
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectQustnrRespondInfoManageStatistics1(Map<?, ?> map) throws Exception;
	
	/**
     * 二쇨????듦퀎瑜?議고쉶 議고쉶?쒕떎.
     *
     * @param map - 議고쉶???뺣낫媛 ?닿릿 map
     * @return List
     * @throws Exception
     */
    public List<EgovMap> selectQustnrRespondInfoManageStatistics2(Map<?, ?> map) throws Exception;

	/**
	 * ?뚯썝?뺣낫瑜?議고쉶?쒕떎.
	 * @param map - 議고쉶???뺣낫媛 ?닿릿 map
	 * @return List
	 * @throws Exception
	 */
	public Map<?, ?> selectQustnrRespondInfoManageEmplyrinfo(Map<?, ?> map) throws Exception;

    /**
	 * ?ㅻЦ?뺣낫瑜?議고쉶?쒕떎.
     *
     * @param map - 議고쉶???뺣낫媛 ?닿릿 map
     * @return List
     * @throws Exception
     */
    public List<EgovMap> selectQustnrRespondInfoManageComtnqestnrinfo(Map<?, ?> map) throws Exception;
    
    /**
     * 臾명빆?뺣낫瑜?議고쉶?쒕떎.
     *
     * @param map - 議고쉶???뺣낫媛 ?닿릿 map
     * @return List
     * @throws Exception
     */
    public List<EgovMap> selectQustnrRespondInfoManageComtnqustnrqesitm(Map<?, ?> map) throws Exception;
    
    /**
     * ??ぉ?뺣낫瑜?議고쉶?쒕떎.
     *
     * @param map - 議고쉶???뺣낫媛 ?닿릿 map
     * @return List
     * @throws Exception
     */
    public List<EgovMap> selectQustnrRespondInfoManageComtnqustnriem(Map<?, ?> map) throws Exception;

    /**
	 *  ?ㅻЦ議곗궗(?ㅻЦ?깅줉)瑜??? 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectQustnrRespondInfoManageList(ComDefaultVO searchVO) throws Exception;

    /**
	 * ?ㅻЦ議곗궗(?ㅻЦ?깅줉)瑜??? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return
	 * @throws Exception
	 */
	public int selectQustnrRespondInfoManageListCnt(ComDefaultVO searchVO) throws Exception;

	/**
	 * ?묐떟?먭껐怨??ㅻЦ議곗궗) 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectQustnrRespondInfoList(ComDefaultVO searchVO) throws Exception;

	/**
	 * ?묐떟?먭껐怨??ㅻЦ議곗궗)瑜??? ?곸꽭議고쉶 ?쒕떎.
	 * 
	 * @param qustnrRespondInfoVO - ?묐떟?먭껐怨??ㅻЦ議곗궗) ?뺣낫 ?닿? VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectQustnrRespondInfoDetail(QustnrRespondInfoVO qustnrRespondInfoVO) throws Exception;

    /**
	 * ?묐떟?먭껐怨??ㅻЦ議곗궗)瑜??? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return int
	 * @throws Exception
	 */
	public int selectQustnrRespondInfoListCnt(ComDefaultVO searchVO) throws Exception;

    /**
	 * ?묐떟?먭껐怨??ㅻЦ議곗궗)瑜??? ?깅줉?쒕떎.
	 * @param qustnrRespondInfoVO - ?묐떟?먭껐怨??ㅻЦ議곗궗) ?뺣낫 ?닿? VO
	 * @throws Exception
	 */
	void  insertQustnrRespondInfo(QustnrRespondInfoVO qustnrRespondInfoVO) throws Exception;

    /**
	 * ?묐떟?먭껐怨??ㅻЦ議곗궗)瑜??? ?섏젙?쒕떎.
	 * @param qustnrRespondInfoVO - ?묐떟?먭껐怨??ㅻЦ議곗궗) ?뺣낫 ?닿? VO
	 * @throws Exception
	 */
	void  updateQustnrRespondInfo(QustnrRespondInfoVO qustnrRespondInfoVO) throws Exception;

    /**
	 * ?묐떟?먭껐怨??ㅻЦ議곗궗)瑜??? ??젣?쒕떎.
	 * @param qustnrRespondInfoVO - ?묐떟?먭껐怨??ㅻЦ議곗궗) ?뺣낫 ?닿? VO
	 * @throws Exception
	 */
	void  deleteQustnrRespondInfo(QustnrRespondInfoVO qustnrRespondInfoVO) throws Exception;

	/**
	 * ?ㅻЦ?쒗뵆由??붿씠?몃━?ㅽ듃瑜?議고쉶?쒕떎.
	 * 
	 * @param map - 議고쉶???뺣낫媛 ?닿릿 map
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectQustnrTmplatWhiteList() throws Exception;

}
