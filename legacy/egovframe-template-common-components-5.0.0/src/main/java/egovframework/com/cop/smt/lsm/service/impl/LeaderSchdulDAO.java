package egovframework.com.cop.smt.lsm.service.impl;
import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.cop.smt.lsm.service.EmplyrVO;
import egovframework.com.cop.smt.lsm.service.LeaderSchdul;
import egovframework.com.cop.smt.lsm.service.LeaderSchdulVO;
import egovframework.com.cop.smt.lsm.service.LeaderSttus;
import egovframework.com.cop.smt.lsm.service.LeaderSttusVO;

/**
 * 媛쒖슂
 * - 媛꾨??쇱젙?????DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - 媛꾨??쇱젙??????깅줉, ?섏젙, ??젣, 議고쉶湲곕뒫???쒓났?쒕떎.
 * - 媛꾨??쇱젙??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?μ쿋??
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 10:59:06
 */
@Repository("LeaderSchdulDAO")
public class LeaderSchdulDAO extends EgovComAbstractDAO {
	
	/**
	 * 二쇱뼱吏?議곌굔??留욌뒗 ?ъ슜?먮? 遺덈윭?⑤떎.
	 * @param EmplyrVO - ?ъ슜??VO
	 * @return List- ?ъ슜??List
	 * 
	 * @param emplyrVO
	 */	
	public List<EmplyrVO> selectEmplyrList(EmplyrVO emplyrVO) throws Exception{
		return selectList("LeaderSchdulDAO.selectEmplyrList", emplyrVO);
	}
	
	/**
	 * ?ъ슜??紐⑸줉??????꾩껜 嫄댁닔瑜?議고쉶?쒕떎.
	 * @param EmplyrVO - ?ъ슜??VO
	 * @return int - ?ъ슜??紐⑸줉 媛쒖닔
	 * 
	 * @param emplyrVO
	 */
	public int selectEmplyrListCnt(EmplyrVO emplyrVO) throws Exception{
		return (Integer)selectOne("LeaderSchdulDAO.selectEmplyrListCnt", emplyrVO);
	}
	
	/**
	 * 二쇱뼱吏?議곌굔???곕Ⅸ 媛꾨??쇱젙 紐⑸줉???붾퀎濡?遺덈윭?⑤떎.
	 * @param LeaderSchdulVO - 媛꾨??쇱젙 VO
	 * @return List - 媛꾨??쇱젙 List
	 * 
	 * @param leaderSchdulVO
	 */
	
	public List<LeaderSchdulVO> selectLeaderSchdulList(LeaderSchdulVO leaderSchdulVO) throws Exception{
		return selectList("LeaderSchdulDAO.selectLeaderSchdulList", leaderSchdulVO);
	}

	/**
	 * 二쇱뼱吏?議곌굔??留욌뒗 媛꾨??쇱젙??遺덈윭?⑤떎.
	 * @param LeaderSchdulVO - 媛꾨??쇱젙 VO
	 * @return LeaderSchdulVO - 媛꾨??쇱젙 VO
	 * 
	 * @param leaderSchdulVO
	 */
	public LeaderSchdulVO selectLeaderSchdul(LeaderSchdulVO leaderSchdulVO) throws Exception{
		return (LeaderSchdulVO)selectOne("LeaderSchdulDAO.selectLeaderSchdul", leaderSchdulVO);
	}

	/**
	 * 媛꾨??쇱젙 ?뺣낫瑜??섏젙?쒕떎.
	 * @param LeaderSchdul - 媛꾨??쇱젙 model
	 * 
	 * @param leaderSchdul
	 */
	public void updateLeaderSchdul(LeaderSchdul leaderSchdul) throws Exception{
		update("LeaderSchdulDAO.updateLeaderSchdul", leaderSchdul);
	}

	/**
	 * 媛꾨??쇱젙 ?뺣낫瑜??깅줉?쒕떎.
	 * @param LeaderSchdul - 媛꾨??쇱젙 model
	 * 
	 * @param leaderSchdul
	 */
	public void insertLeaderSchdul(LeaderSchdul leaderSchdul) throws Exception{
		insert("LeaderSchdulDAO.insertLeaderSchdul", leaderSchdul);
	}
	
	/**
	 * 媛꾨??쇱젙 ?쇱옄 ?뺣낫瑜??깅줉?쒕떎.
	 * @param LeaderSchdul - 媛꾨??쇱젙 model
	 * 
	 * @param leaderSchdul
	 */
	public void insertLeaderSchdulDe(LeaderSchdul leaderSchdul) throws Exception{
		insert("LeaderSchdulDAO.insertLeaderSchdulDe", leaderSchdul);
	}

	/**
	 * 媛꾨??쇱젙 ?뺣낫瑜???젣?쒕떎.
	 * @param LeaderSchdul - 媛꾨??쇱젙 model
	 * 
	 * @param leaderSchdul
	 */
	public void deleteLeaderSchdul(LeaderSchdul leaderSchdul) throws Exception{
		delete("LeaderSchdulDAO.deleteLeaderSchdul", leaderSchdul);
	}
	
	/**
	 * 媛꾨??쇱젙?쇱옄 ?뺣낫瑜???젣?쒕떎.
	 * @param LeaderSchdul - 媛꾨??쇱젙 model
	 * 
	 * @param leaderSchdul
	 */
	public void deleteLeaderSchdulDe(LeaderSchdul leaderSchdul) throws Exception{
		delete("LeaderSchdulDAO.deleteLeaderSchdulDe", leaderSchdul);
	}
	
	/**
	 * 二쇱뼱吏?議곌굔???곕Ⅸ 媛꾨??곹깭 紐⑸줉??遺덈윭?⑤떎.
	 * @param LeaderSttusVO - 媛꾨??곹깭 VO
	 * @return List - 媛꾨??곹깭 List
	 * 
	 * @param LeaderSttusVO
	 */
	public List<LeaderSttusVO> selectLeaderSttusList(LeaderSttusVO leaderSttusVO) throws Exception{
		return selectList("LeaderSchdulDAO.selectLeaderSttusList", leaderSttusVO);
	}
	
	/**
	 * 媛꾨??곹깭 紐⑸줉??????꾩껜 嫄댁닔瑜?議고쉶?쒕떎.
	 * @param LeaderSttusVO - 媛꾨??곹깭 VO
	 * @return int
	 * 
	 * @param LeaderSttusVO
	 */
	public int selectLeaderSttusListCnt(LeaderSttusVO leaderSttusVO) throws Exception{
		return (Integer)selectOne("LeaderSchdulDAO.selectLeaderSttusListCnt", leaderSttusVO);
	}
	
	/**
	 * 二쇱뼱吏?議곌굔??留욌뒗 媛꾨??곹깭瑜?遺덈윭?⑤떎.
	 * @param LeaderSttusVO - 媛꾨??곹깭 VO
	 * @return LeaderSttusVO - 媛꾨??곹깭 VO
	 * 
	 * @param leaderSttusVO
	 */
	public LeaderSttusVO selectLeaderSttus(LeaderSttusVO leaderSttusVO) throws Exception{
		return (LeaderSttusVO)selectOne("LeaderSchdulDAO.selectLeaderSttus", leaderSttusVO);
	}

	/**
	 * 媛꾨??곹깭 ?뺣낫瑜??섏젙?쒕떎.
	 * @param LeaderSttus - 媛꾨??곹깭 model
	 * 
	 * @param leaderSttus
	 */
	public void updateLeaderSttus(LeaderSttus leaderSttus) throws Exception{
		update("LeaderSchdulDAO.updateLeaderSttus", leaderSttus);
	}

	/**
	 * 媛꾨??곹깭 ?뺣낫瑜??깅줉?쒕떎.
	 * @param LeaderSttus - 媛꾨??곹깭 model
	 * 
	 * @param leaderSttus
	 */
	public void insertLeaderSttus(LeaderSttus leaderSttus) throws Exception{
		insert("LeaderSchdulDAO.insertLeaderSttus", leaderSttus);
	}
	
	/**
	 * 媛꾨??곹깭 ?깅줉???꾪븳 以묐났 議고쉶瑜??섑뻾?쒕떎.
	 * @param LeaderSttus - 媛꾨??곹깭 model
	 * @return int
	 * 
	 * @param leaderSttus
	 */
	public int selectLeaderSttusCheck(LeaderSttus leaderSttus) throws Exception{
		return (Integer)selectOne("LeaderSchdulDAO.selectLeaderSttusCheck", leaderSttus);
	}

	/**
	 * 媛꾨??곹깭 ?뺣낫瑜???젣?쒕떎.
	 * @param LeaderSttus - 媛꾨??곹깭 model
	 * 
	 * @param leaderSttus
	 */
	public void deleteLeaderSttus(LeaderSttus leaderSttus) throws Exception{
		delete("LeaderSchdulDAO.deleteLeaderSttus", leaderSttus);
	}

}
