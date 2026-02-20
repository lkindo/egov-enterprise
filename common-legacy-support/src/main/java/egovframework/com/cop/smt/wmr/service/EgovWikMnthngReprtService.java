package egovframework.com.cop.smt.wmr.service;

import java.util.Map;


/**
 * ??
 * - ????????Service Interface?????.
 * 
 * ???
 * - ?????????, ??, ???? ???????.
 * - ??????? ?, ??????.
 * @author ???
 * @version 1.0
 * @created 19-7-2010 ?? 10:12:47
 *   <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2010.7.19	???         ????
 *
 * </pre>
 **/
public interface EgovWikMnthngReprtService {
	
	/**
	 * ????????.
	 * @param ReportrVO
	 * @return  Map<String, Object>
	 * 
	 * @param reportrVO
	 **/
	public Map<String, Object> selectReportrList(ReportrVO reportrVO) throws Exception;
	
	/**
	 * ?????????????.
	 * @param String
	 * @return  String
	 * 
	 * @param String
	 **/
	public String selectWrterClsfNm(String wrterId) throws Exception;
	
	/**
	 * ????????.
	 * @param WikMnthngReprtVO - ???VO
	 * @return  Map<String, Object> - ???List
	 * 
	 * @param wikMnthngReprtVO
	 **/
	public Map<String, Object> selectWikMnthngReprtList(WikMnthngReprtVO wikMnthngReprtVO) throws Exception;

	/**
	 * ?????????.
	 * @param WikMnthngReprtVO - ???VO
	 * @return  WikMnthngReprtVO - ???VO
	 * 
	 * @param wikMnthngReprtVO
	 **/
	public WikMnthngReprtVO selectWikMnthngReprt(WikMnthngReprtVO wikMnthngReprtVO) throws Exception;

	/**
	 * ??????????.
	 * @param WikMnthngReprt - ???model
	 * 
	 * @param wikMnthngReprt
	 **/
	public void updateWikMnthngReprt(WikMnthngReprt wikMnthngReprt) throws Exception;

	/**
	 * ?????????.
	 * @param WikMnthngReprt - ???model
	 * 
	 * @param wikMnthngReprt
	 **/
	public void insertWikMnthngReprt(WikMnthngReprt wikMnthngReprt) throws Exception;

	/**
	 * ??????????.
	 * @param WikMnthngReprt - ???model
	 * 
	 * @param wikMnthngReprt
	 **/
	public void confirmWikMnthngReprt(WikMnthngReprt wikMnthngReprt) throws Exception;

	/**
	 * ???????????.
	 * @param WikMnthngReprt - ???model
	 * 
	 * @param wikMnthngReprt
	 **/
	public void deleteWikMnthngReprt(WikMnthngReprt wikMnthngReprt) throws Exception;

}
