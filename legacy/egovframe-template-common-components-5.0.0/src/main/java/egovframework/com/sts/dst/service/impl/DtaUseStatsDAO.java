**
 * 媛쒖슂
 * - ?먮즺?댁슜?꾪솴 ?듦퀎?????DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?먮즺?댁슜?꾪솴 ?듦퀎??????깅줉, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - ?먮즺?댁슜?꾪솴 ?듦퀎??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author lee.m.j
 * @version 1.0
 * @created 08-9-2009 ?ㅽ썑 1:40:19
 */

package egovframework.com.sts.dst.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.sts.dst.service.DtaUseStats;
import egovframework.com.sts.dst.service.DtaUseStatsVO;

@Repository("dtaUseStatsDAO")
public class DtaUseStatsDAO extends EgovComAbstractDAO {

	/**
	 * ?먮즺?댁슜?꾪솴 ?듦퀎?뺣낫????곷ぉ濡앹쓣 議고쉶?쒕떎.
	 * @param dtaUseStatsVO - ?먮즺?댁슜?꾪솴 VO
	 * @return List - ?먮즺?댁슜?꾪솴 紐⑸줉
	 */
	public List<DtaUseStatsVO> selectDtaUseStatsList(DtaUseStatsVO dtaUseStatsVO) throws Exception {
		return selectList("dtaUseStatsDAO.selectDtaUseStatsList", dtaUseStatsVO);
	}

	/**
	 * ?먮즺?댁슜?꾪솴 ?듦퀎?뺣낫????곷ぉ濡?移댁슫?몃? 議고쉶?쒕떎.
	 * @param dtaUseStatsVO - ?먮즺?댁슜?꾪솴 VO
	 * @return int
	 */
	public int selectDtaUseStatsListTotCnt(DtaUseStatsVO dtaUseStatsVO) throws Exception {
		return (Integer)selectOne("dtaUseStatsDAO.selectDtaUseStatsListTotCnt", dtaUseStatsVO);
	}	
		
	/**
	 * ?먮즺?댁슜?꾪솴 ?듦퀎?뺣낫???꾩껜 移댁슫?몃? 議고쉶?쒕떎.
	 * @param dtaUseStatsVO - ?먮즺?댁슜?꾪솴 VO
	 * @return int
	 */
	public int selectDtaUseStatsListBarTotCnt(DtaUseStatsVO dtaUseStatsVO) throws Exception {
		return (Integer)selectOne("dtaUseStatsDAO.selectDtaUseStatsListBarTotCnt", dtaUseStatsVO);
	}		
	
	/**
	 * ?먮즺?댁슜?꾪솴 ?듦퀎???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param dtaUseStatsVO - ?먮즺?댁슜?꾪솴 VO
	 * @return reprtStatsVO - ?먮즺?댁슜?꾪솴 VO
	 */
	public List<DtaUseStatsVO> selectDtaUseStats(DtaUseStatsVO dtaUseStatsVO) throws Exception {
		return selectList("dtaUseStatsDAO.selectDtaUseStats", dtaUseStatsVO);
	}

	/**
	 * ?먮즺?댁슜?꾪솴 ?듦퀎?뺣낫???곸꽭?뺣낫紐⑸줉 移댁슫?몃? 議고쉶?쒕떎.
	 * @param dtaUseStatsVO - ?먮즺?댁슜?꾪솴 VO
	 * @return int
	 */
	public int selectDtaUseStatsTotCnt(DtaUseStatsVO dtaUseStatsVO) throws Exception {
		return (Integer)selectOne("dtaUseStatsDAO.selectDtaUseStatsTotCnt", dtaUseStatsVO);
	}	
	
    /**
	 * ?먮즺?댁슜?꾪솴 ?뺣낫瑜??깅줉???꾪븳 ?ㅼ슫濡쒕뱶 泥⑤??붿씪 ?뺣낫瑜?議고쉶?쒕떎.
	 * @param dtaUseStats DtaUseStats
	 * @return DtaUseStats
	 * @exception Exception
	 */
    public DtaUseStats selectInsertDtaUseStats(DtaUseStats dtaUseStats) throws Exception {
        return (DtaUseStats) selectOne("dtaUseStatsDAO.selectInsertDtaUseStats", dtaUseStats);
    }	
	
	/**
	 * ?먮즺?댁슜?꾪솴 ?뺣낫瑜??깅줉?쒕떎.
	 * @param dtaUseStats - ?먮즺?댁슜?꾪솴 model
	 */
	public void insertDtaUseStats(DtaUseStats dtaUseStats) throws Exception {

		insert("dtaUseStatsDAO.insertDtaUseStats", dtaUseStats);
	}

	/**
	 * ?깅줉?쇱옄蹂??듦퀎?뺣낫瑜?洹몃옒?꾨줈 ?쒗쁽?쒕떎.
	 * @param dtaUseStatsVO - ?먮즺?댁슜?꾪솴 VO
	 * @return List - ?깅줉?쇱옄蹂??먮즺?댁슜?꾪솴 紐⑸줉
	 */
	public List<DtaUseStatsVO> selectDtaUseStatsBarList(DtaUseStatsVO dtaUseStatsVO) throws Exception {
		return selectList("dtaUseStatsDAO.selectDtaUseStatsBarList", dtaUseStatsVO);
	}
}
