package egovframework.com.cop.smt.mrm.service;

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
 * @created 19-7-2010 ?? 10:14:53
 *  <pre>
 * << ?????Modification Information) >>
 *   
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2010.7.19	???         ????
 *
 * </pre>
 **/
public interface EgovMemoReprtService {
	/**
	 * ????????.
	 * @param ReportrVO
	 * @return  Map<String, Object>
	 * 
	 * @param reportrVO
	 **/
	public Map<String, Object> selectReportrList(ReportrVO reportrVO) throws Exception;
	
	
	/**
	 * ??????? ??????.
	 * @param String
	 * @return  String
	 * 
	 * @param String
	 **/
	public String selectWrterClsfNm(String wrterId) throws Exception;
	
	/**
	 * ????????.
	 * @param MemoReprtVO - ???VO
	 * @return  List<MemoReprtVO> - ???List
	 * 
	 * @param memoReprtVO
	 **/
	public Map<String, Object> selectMemoReprtList(MemoReprtVO memoReprtVO) throws Exception;

	/**
	 * ?????????.
	 * @param MemoReprtVO - ???VO
	 * @return  MemoReprtVO - ???VO
	 * 
	 * @param memoReprtVO
	 **/
	public MemoReprtVO selectMemoReprt(MemoReprtVO memoReprtVO) throws Exception;

	/**
	 * ??????????????????.
	 * @param MemoReprt - ???model
	 * 
	 * @param memoReprt
	 **/
	public void readMemoReprt(MemoReprt memoReprt) throws Exception;

	/**
	 * ??????????.
	 * @param MemoReprt - ???model
	 * 
	 * @param memoReprt
	 **/
	public void updateMemoReprt(MemoReprt memoReprt) throws Exception;

	/**
	 * ???????????????.
	 * @param MemoReprt - ???model
	 * 
	 * @param memoReprt
	 **/
	public void updateMemoReprtDrctMatter(MemoReprt memoReprt) throws Exception;

	/**
	 * ?????????.
	 * @param MemoReprt - ???model
	 * 
	 * @param memoReprt
	 **/
	public void insertMemoReprt(MemoReprt memoReprt) throws Exception;

	/**
	 * ???????????.
	 * @param MemoReprt - ???model
	 * 
	 * @param memoReprt
	 **/
	public void deleteMemoReprt(MemoReprtVO memoReprtVO) throws Exception;

}
