package egovframework.com.cop.smt.lsm.service;

import java.util.List;
import java.util.Map;

/**
 * 간부일정관리에 대한 서비스 인터페이스 클래스
 */
public interface EgovLeaderSchdulService {

	/**
	 * 간부일정 목록을 조회한다.
	 * 
	 * @param searchVO
	 * @return List
	 * @throws Exception
	 */
	public List<LeaderSchdulVO> selectLeaderSchdulList(LeaderSchdulVO searchVO) throws Exception;

	/**
	 * 간부일정 총 갯수를 조회한다.
	 * 
	 * @param searchVO
	 * @return int
	 * @throws Exception
	 */
	public int selectLeaderSchdulListCnt(LeaderSchdulVO searchVO) throws Exception;

	/**
	 * 간부일정을 조회한다.
	 * 
	 * @param leaderSchdulVO
	 * @return LeaderSchdulVO
	 * @throws Exception
	 */
	public LeaderSchdulVO selectLeaderSchdul(LeaderSchdulVO leaderSchdulVO) throws Exception;

	/**
	 * 간부일정을 등록한다.
	 * 
	 * @param leaderSchdul
	 * @throws Exception
	 */
	public void insertLeaderSchdul(LeaderSchdul leaderSchdul) throws Exception;

	/**
	 * 간부일정을 수정한다.
	 * 
	 * @param leaderSchdul
	 * @throws Exception
	 */
	public void updateLeaderSchdul(LeaderSchdul leaderSchdul) throws Exception;

	/**
	 * 간부일정을 삭제한다.
	 * 
	 * @param leaderSchdul
	 * @throws Exception
	 */
	public void deleteLeaderSchdul(LeaderSchdul leaderSchdul) throws Exception;

	/**
	 * 간부상태 목록을 조회한다.
	 * 
	 * @param searchVO
	 * @return Map
	 * @throws Exception
	 */
	public Map<String, Object> selectLeaderSttusList(LeaderSttusVO searchVO) throws Exception;

	/**
	 * 간부상태 총 갯수를 조회한다.
	 * 
	 * @param searchVO
	 * @return int
	 * @throws Exception
	 */
	public int selectLeaderSttusListCnt(LeaderSttusVO searchVO) throws Exception;

	/**
	 * 간부상태를 조회한다.
	 * 
	 * @param leaderSttusVO
	 * @return LeaderSttusVO
	 * @throws Exception
	 */
	public LeaderSttusVO selectLeaderSttus(LeaderSttusVO leaderSttusVO) throws Exception;

	/**
	 * 간부상태를 등록한다.
	 * 
	 * @param leaderSttus
	 * @throws Exception
	 */
	public void insertLeaderSttus(LeaderSttus leaderSttus) throws Exception;

	/**
	 * 간부상태를 수정한다.
	 * 
	 * @param leaderSttus
	 * @throws Exception
	 */
	public void updateLeaderSttus(LeaderSttus leaderSttus) throws Exception;

	/**
	 * 간부상태를 삭제한다.
	 * 
	 * @param leaderSttus
	 * @throws Exception
	 */
	public void deleteLeaderSttus(LeaderSttus leaderSttus) throws Exception;

	/**
	 * 간부상태 중복체크를 한다.
	 * 
	 * @param leaderSttus
	 * @return int
	 * @throws Exception
	 */
	public int selectLeaderSttusCheck(LeaderSttus leaderSttus) throws Exception;

}
