package egovframework.com.uss.ion.rsm.service;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

/**
 * 理쒓렐寃?됱뼱瑜?泥섎━?섎뒗 Service Class 援ы쁽
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
public interface EgovRecentSrchwrdService {

	/**
	* 理쒓렐寃?됱뼱愿由?紐⑸줉??議고쉶?쒕떎.
	* @param searchVO  議고쉶???뺣낫媛 ?닿릿 VO
	* @return List
	* @throws Exception
	*/
	public List<EgovMap> selectRecentSrchwrdList(RecentSrchwrd searchVO) throws Exception;

	/**
	* 理쒓렐寃?됱뼱愿由щ?(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	* @param searchVO  議고쉶???뺣낫媛 ?닿릿 VO
	* @return int
	* @throws Exception
	*/
	public int selectRecentSrchwrdListCnt(RecentSrchwrd searchVO) throws Exception;

	/**
	 * 理쒓렐寃?됱뼱愿由щ?(?? ?곸꽭議고쉶 ?쒕떎.
	 * @param RecentSrchwrd  理쒓렐寃?됱뼱愿由??뺣낫媛 ?닿? VO
	 * @return List
	 * @throws Exception
	 */
	public RecentSrchwrd selectRecentSrchwrdDetail(RecentSrchwrd recentSrchwrd) throws Exception;

	/**
	* 理쒓렐寃?됱뼱愿由щ?(?? ?깅줉?쒕떎.
	* @param recentSrchwrd  理쒓렐寃?됱뼱愿由??뺣낫媛 ?닿? VO
	* @throws Exception
	*/
	void insertRecentSrchwrd(RecentSrchwrd recentSrchwrd) throws Exception;

	/**
	* 理쒓렐寃?됱뼱愿由щ?(?? ?섏젙?쒕떎.
	* @param recentSrchwrd  理쒓렐寃?됱뼱愿由??뺣낫媛 ?닿? VO
	* @throws Exception
	*/
	void updateRecentSrchwrd(RecentSrchwrd recentSrchwrd) throws Exception;

	/**
	 * 理쒓렐寃?됱뼱愿由щ?(?? ??젣?쒕떎.
	 * @param recentSrchwrd  理쒓렐寃?됱뼱愿由??뺣낫媛 ?닿? VO
	 * @throws Exception
	 */
	void deleteRecentSrchwrd(RecentSrchwrd recentSrchwrd) throws Exception;

	/**
	 * 理쒓렐寃?됱뼱寃곌낵 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO  議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectRecentSrchwrdResultInquire(RecentSrchwrd recentSrchwrd) throws Exception;

	/**
	 * 理쒓렐寃?됱뼱寃곌낵 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO  議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	public List<?> selectRecentSrchwrdResultList(RecentSrchwrd searchVO) throws Exception;

	/**
	 * 理쒓렐寃?됱뼱寃곌낵瑜??? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @param searchVO  議고쉶???뺣낫媛 ?닿릿 VO
	 * @return int
	 * @throws Exception
	 */
	public int selectRecentSrchwrdResultListCnt(RecentSrchwrd searchVO) throws Exception;

	/**
	 * 理쒓렐寃?됱뼱寃곌낵瑜??? ?깅줉?쒕떎.
	 * @param recentSrchwrd  理쒓렐寃?됱뼱愿由??뺣낫媛 ?닿? VO
	 * @throws Exception
	 */
	void insertRecentSrchwrdResult(RecentSrchwrd recentSrchwrd) throws Exception;

	/**
	 * 理쒓렐寃?됱뼱寃곌낵瑜??? 嫄대퀎濡???젣 ?쒕떎.
	 * @param recentSrchwrd  理쒓렐寃?됱뼱愿由??뺣낫媛 ?닿? VO
	 * @throws Exception
	 */
	void deleteRecentSrchwrdResult(RecentSrchwrd recentSrchwrd) throws Exception;

	/**
	 * 理쒓렐寃?됱뼱寃곌낵瑜??? 愿由щ퀎濡???젣 ?쒕떎.
	 * @param recentSrchwrd  理쒓렐寃?됱뼱愿由??뺣낫媛 ?닿? VO
	 * @throws Exception
	 */
	void deleteRecentSrchwrdResultAll(RecentSrchwrd recentSrchwrd) throws Exception;

}
