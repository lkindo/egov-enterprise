package egovframework.com.uss.ion.ulm.service;

import java.util.List;

import egovframework.com.cmm.ComDefaultVO;

/**
 * ?듯빀留곹겕愿由щ? 泥섎━?섎뒗 Service Class 援ы쁽
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2009.07.03
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.07.03  ?λ룞??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
public interface EgovUnityLinkService {

	/**
	 * ?듯빀留곹겕愿由?硫붿씤 ?덊뵆 紐⑸줉??議고쉶?쒕떎.
	 * @param unityLink  ?듯빀留곹겕愿由??뺣낫 ?닿? VO
	 * @return List
	 * @throws Exception
	 */
	public List<?> selectUnityLinkSample(UnityLink unityLink) throws Exception;

	/**
	* ?듯빀留곹겕愿由?紐⑸줉??議고쉶?쒕떎.
	* @param searchVO  議고쉶???뺣낫媛 ?닿릿 VO
	* @return List
	* @throws Exception
	*/
	public List<?> selectUnityLinkList(ComDefaultVO searchVO) throws Exception;

	/**
	* ?듯빀留곹겕愿由щ?(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	* @param searchVO  議고쉶???뺣낫媛 ?닿릿 VO
	* @return int
	* @throws Exception
	*/
	public int selectUnityLinkListCnt(ComDefaultVO searchVO) throws Exception;

	/**
	 * ?듯빀留곹겕愿由щ?(?? ?곸꽭議고쉶 ?쒕떎.
	 * @param unityLink  ?듯빀留곹겕愿由??뺣낫 ?닿? VO
	 * @return List
	 * @throws Exception
	 */
	public UnityLink selectUnityLinkDetail(UnityLink unityLink) throws Exception;

	/**
	* ?듯빀留곹겕愿由щ?(?? ?깅줉?쒕떎.
	* @param unityLink  ?듯빀留곹겕愿由??뺣낫 ?닿? VO
	* @throws Exception
	*/
	void insertUnityLink(UnityLink unityLink) throws Exception;

	/**
	* ?듯빀留곹겕愿由щ?(?? ?섏젙?쒕떎.
	* @param unityLink  ?듯빀留곹겕愿由??뺣낫 ?닿? VO
	* @throws Exception
	*/
	void updateUnityLink(UnityLink unityLink) throws Exception;

	/**
	 * ?듯빀留곹겕愿由щ?(?? ??젣?쒕떎.
	 * @param unityLink  ?듯빀留곹겕愿由??뺣낫 ?닿? VO
	 * @throws Exception
	 */
	void deleteUnityLink(UnityLink unityLink) throws Exception;

}
