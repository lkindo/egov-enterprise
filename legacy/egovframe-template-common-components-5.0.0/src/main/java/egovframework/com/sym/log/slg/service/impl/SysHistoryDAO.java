package egovframework.com.sym.log.slg.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.sym.log.slg.service.SysHistory;
import egovframework.com.sym.log.slg.service.SysHistoryVO;

/**
 * @Class Name : SysHistoryDAO.java
 * @Description : ?쒖뒪???대젰?뺣낫瑜?愿由ы븯湲??꾪븳 ?곗씠??泥섎━ ?대옒??
 * @Modification Information
 *
 *    ?섏젙??      ?섏젙??        ?섏젙?댁슜
 *    -------        -------     -------------------
 *    2009. 3. 9.   ?댁궪??
 *
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? ?댁궪??
 * @since 2009. 3. 9.
 * @version
 * @see
 *
 */
@Repository("sysHistoryDAO")
public class SysHistoryDAO extends EgovComAbstractDAO {


	/**
	 * ?쒖뒪???대젰?뺣낫瑜??앹꽦?쒕떎.
	 * @param history - ?쒖뒪???대젰?뺣낫媛 ?닿릿 紐⑤뜽 媛앹껜
	 */
	public int insertSysHistory(SysHistory history) throws Exception{
		return insert("SysHistoryDAO.insertSysHistory", history);
	}


	/**
	 * ?쒖뒪???대젰?뺣낫瑜??섏젙?쒕떎.
	 * @param history - ?쒖뒪???대젰?뺣낫媛 ?닿릿 紐⑤뜽 媛앹껜
	 */
	public void updateSysHistory(SysHistory history) throws Exception{
		update("SysHistoryDAO.updateSysHistory", history);
	}

	/**
	 * ?쒖뒪???대젰?뺣낫瑜???젣?쒕떎.
	 * @param history - ?쒖뒪???대젰?뺣낫媛 ?닿릿 紐⑤뜽 媛앹껜
	 */
	public void deleteSysHistory(SysHistory history) throws Exception{
		delete("SysHistoryDAO.deleteSysHistory", history);
	}


	/**
	 * ?쒖뒪???대젰?뺣낫 紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param history - ?쒖뒪???대젰?뺣낫媛 ?닿릿 紐⑤뜽 媛앹껜
	 */
	public List<SysHistoryVO> selectSysHistorList(SysHistoryVO historyVO) throws Exception{
		return selectList("SysHistoryDAO.selectSysHistoryList", historyVO);
	}

	/**
	 * ?쒖뒪???대젰?뺣낫 紐⑸줉??湲 媛쒖닔瑜?議고쉶?쒕떎.
	 * @param history
	 * @return
	 * @throws Exception
	 */
	public int selectSysHistortListCnt(SysHistoryVO historyVO) throws Exception{
		return (Integer)selectOne("SysHistoryDAO.selectSysHistoryListCnt", historyVO);
	}

	/**
	 * ?쒖뒪???대젰?뺣낫瑜?議고쉶?쒕떎.
	 *
	 * @param history - ?쒖뒪???대젰?뺣낫媛 ?닿릿 紐⑤뜽 媛앹껜
	 */
	public SysHistoryVO selectSysHistory(SysHistoryVO historyVO) throws Exception{

		return (SysHistoryVO) selectOne("SysHistoryDAO.selectSysHistory", historyVO);
	}



}
