package egovframework.com.utl.sys.ssy.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.utl.sys.ssy.service.SynchrnServer;
import egovframework.com.utl.sys.ssy.service.SynchrnServerVO;

/**
 * 媛쒖슂
 * - ?숆린?붾????쒕쾭?????DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?숆린?붾????쒕쾭??????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - ?숆린?붾????쒕쾭??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author lee.m.j
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 10:44:57
 */
@Repository("synchrnServerDAO")
public class SynchrnServerDAO extends EgovComAbstractDAO {

	/**
	 * ?숆린?붾????쒕쾭瑜?愿由ы븯湲??꾪빐 ?깅줉???숆린?붾????쒕쾭紐⑸줉??議고쉶?쒕떎.
	 * @param synchrnServerVO - ?숆린?붾????쒕쾭 Vo
	 * @return List - ?숆린?붾????쒕쾭 紐⑸줉
	 */
	public List<SynchrnServerVO> selectSynchrnServerList(SynchrnServerVO synchrnServerVO) throws Exception {
		return selectList("synchrnServerDAO.selectSynchrnServerList", synchrnServerVO);
	}

	/**
	 * ?숆린?붾????쒕쾭紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param synchrnServerVO - ?숆린?붾????쒕쾭 Vo
	 * @return int - ?숆린?붾????쒕쾭 移댁슫????
	 */
	public int selectSynchrnServerListTotCnt(SynchrnServerVO synchrnServerVO) throws Exception {
		return (Integer)selectOne("synchrnServerDAO.selectSynchrnServerListTotCnt", synchrnServerVO);
	}

	/**
	 * ?깅줉???숆린?붾????쒕쾭???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param synchrnServerVO - ?숆린?붾????쒕쾭 Vo
	 * @return synchrnServerVO - ?숆린?붾????쒕쾭 Vo
	 */
	public SynchrnServerVO selectSynchrnServer(SynchrnServerVO synchrnServerVO) throws Exception {
		return (SynchrnServerVO) selectOne("synchrnServerDAO.selectSynchrnServer", synchrnServerVO);
	}

	/**
	 * ?숆린?붾????쒕쾭?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param synchrnServer - ?숆린?붾????쒕쾭 model
	 */
	public void insertSynchrnServer(SynchrnServer synchrnServer) throws Exception {
		insert("synchrnServerDAO.insertSynchrnServer", synchrnServer);
	}

	/**
	 * 湲??깅줉???숆린?붾????쒕쾭?뺣낫瑜??섏젙?쒕떎.
	 * @param synchrnServer - ?숆린?붾????쒕쾭 model
	 */
	public void updateSynchrnServer(SynchrnServer synchrnServer) throws Exception {
		update("synchrnServerDAO.updateSynchrnServer", synchrnServer);
	}

	/**
	 * 湲??깅줉???숆린?붾????쒕쾭?뺣낫瑜???젣?쒕떎.
	 * @param synchrnServer - ?숆린?붾????쒕쾭 model
	 */
	public void deleteSynchrnServer(SynchrnServer synchrnServer) throws Exception {
		delete("synchrnServerDAO.deleteSynchrnServer", synchrnServer);
	}

	/**
	 * ?낅줈???뚯씪???숆린?붾????쒕쾭?ㅼ쓣 ??곸쑝濡??숆린??泥섎━瑜??쒕떎.
	 * @param synchrnServerVO - ?숆린?붾????쒕쾭 Vo
	 * @return boolean - ?깃났?щ?
	 */
	public void processSynchrn(SynchrnServer synchrnServer) throws Exception {
		update("synchrnServerDAO.processSynchrn", synchrnServer);
	}

	/**
	 * ?숆린??泥섎━瑜??섍린 ?꾪빐 ?숆린?붾????쒕쾭紐⑸줉??議고쉶?쒕떎.
	 * @param synchrnServerVO - ?숆린?붾????쒕쾭 Vo
	 * @return List - ?숆린?붾????쒕쾭 紐⑸줉
	 */
	public List<SynchrnServerVO> processSynchrnServerList(SynchrnServerVO synchrnServerVO) throws Exception {
		return selectList("synchrnServerDAO.processSynchrnServerList", synchrnServerVO);
	}
}