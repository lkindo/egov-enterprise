package egovframework.com.dam.spe.req.service;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;
/**
 * 吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥?? 泥섎━?섎뒗 Service Class 援ы쁽
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2010.08.30
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.08.30  ?λ룞??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
public interface EgovRequestOfferService {

    /**
     * ??젣???섏쐞 ?듬? 嫄댁닔瑜?議고쉶?쒕떎.
     * @param RequestOfferVO  議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return int
     * @throws Exception
     */
    public int selectRequestOfferDelCnt(Map<?, ?> map) throws Exception;

	/**
	 * ?깅줉??吏?앹쟾臾멸? 嫄댁닔瑜?議고쉶?쒕떎.
	 * @param map  議고쉶???뺣낫媛 ?닿릿 媛앹껜
	 * @return List
	 * @throws Exception
	 */
	public boolean selectRequestOfferSpeCheck(Map<?, ?> map) throws Exception;

    /**
	 * 吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥?紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO  議고쉶???뺣낫媛 ?닿릿 媛앹껜
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectRequestOfferList(RequestOfferVO requestOfferVO) throws Exception;

    /**
     * 吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥??(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
     * @param searchVO  議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return int
     * @throws Exception
     */
    public int selectRequestOfferListCnt(RequestOfferVO requestOfferVO) throws Exception;

     /**
	 * 吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥??(?? ?곸꽭議고쉶 ?쒕떎.
	 * @param requestOfferVO  吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥??뺣낫 ?닿? 媛앹껜
	 * @return List
	 * @throws Exception
	 */
	public RequestOfferVO selectRequestOfferDetail(RequestOfferVO requestOfferVO) throws Exception;

     /**
	 * 吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥??(?? ?깅줉?쒕떎.
	 * @param requestOfferVO  吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥??뺣낫 ?닿? 媛앹껜
	 * @throws Exception
	 */
	void  insertRequestOffer(RequestOfferVO requestOfferVO) throws Exception;

     /**
	 * 吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥??(?? ?섏젙?쒕떎.
	 * @param requestOfferVO  吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥??뺣낫 ?닿? 媛앹껜
	 * @throws Exception
	 */
	void  updateRequestOffer(RequestOfferVO requestOfferVO) throws Exception;

	/**
	 * 吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥??(?? ??젣?쒕떎.
	 * @param requestOfferVO  吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥??뺣낫 ?닿? VO
	 * @throws Exception
	 */
	void  deleteRequestOffer(RequestOfferVO requestOfferVO) throws Exception;

}
