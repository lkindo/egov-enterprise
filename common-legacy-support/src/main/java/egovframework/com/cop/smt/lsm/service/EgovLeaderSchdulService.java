package egovframework.com.cop.smt.lsm.service;

import java.util.List;
import java.util.Map;

/**
 * ????? ??????????????????
 **/
public interface EgovLeaderSchdulService {

	/**
	 * ??? ?????.
	 * 
	 * @param searchVO
	 * @return List
	 * @throws Exception
	 **/
	public List<LeaderSchdulVO> selectLeaderSchdulList(LeaderSchdulVO searchVO) throws Exception;

	/**
	 * ??? ????????.
	 * 
	 * @param searchVO
	 * @return int
	 * @throws Exception
	 **/
	public int selectLeaderSchdulListCnt(LeaderSchdulVO searchVO) throws Exception;

	/**
	 * ????????.
	 * 
	 * @param leaderSchdulVO
	 * @return LeaderSchdulVO
	 * @throws Exception
	 **/
	public LeaderSchdulVO selectLeaderSchdul(LeaderSchdulVO leaderSchdulVO) throws Exception;

	/**
	 * ????????.
	 * 
	 * @param leaderSchdul
	 * @throws Exception
	 **/
	public void insertLeaderSchdul(LeaderSchdul leaderSchdul) throws Exception;

	/**
	 * ?????????.
	 * 
	 * @param leaderSchdul
	 * @throws Exception
	 **/
	public void updateLeaderSchdul(LeaderSchdul leaderSchdul) throws Exception;

	/**
	 * ??????????.
	 * 
	 * @param leaderSchdul
	 * @throws Exception
	 **/
	public void deleteLeaderSchdul(LeaderSchdul leaderSchdul) throws Exception;

	/**
	 * ?? ?????.
	 * 
	 * @param searchVO
	 * @return Map
	 * @throws Exception
	 **/
	public Map<String, Object> selectLeaderSttusList(LeaderSttusVO searchVO) throws Exception;

	/**
	 * ?? ????????.
	 * 
	 * @param searchVO
	 * @return int
	 * @throws Exception
	 **/
	public int selectLeaderSttusListCnt(LeaderSttusVO searchVO) throws Exception;

	/**
	 * ???????.
	 * 
	 * @param leaderSttusVO
	 * @return LeaderSttusVO
	 * @throws Exception
	 **/
	public LeaderSttusVO selectLeaderSttus(LeaderSttusVO leaderSttusVO) throws Exception;

	/**
	 * ???????.
	 * 
	 * @param leaderSttus
	 * @throws Exception
	 **/
	public void insertLeaderSttus(LeaderSttus leaderSttus) throws Exception;

	/**
	 * ????????.
	 * 
	 * @param leaderSttus
	 * @throws Exception
	 **/
	public void updateLeaderSttus(LeaderSttus leaderSttus) throws Exception;

	/**
	 * ?????????.
	 * 
	 * @param leaderSttus
	 * @throws Exception
	 **/
	public void deleteLeaderSttus(LeaderSttus leaderSttus) throws Exception;

	/**
	 * ?? ??????.
	 * 
	 * @param leaderSttus
	 * @return int
	 * @throws Exception
	 **/
	public int selectLeaderSttusCheck(LeaderSttus leaderSttus) throws Exception;

}
