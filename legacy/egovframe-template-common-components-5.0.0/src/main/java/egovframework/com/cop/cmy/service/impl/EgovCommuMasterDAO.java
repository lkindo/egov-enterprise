package egovframework.com.cop.cmy.service.impl;

import java.util.List;

import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.cop.cmy.service.Community;
import egovframework.com.cop.cmy.service.CommunityVO;

@Repository("EgovCommuMasterDAO")
public class EgovCommuMasterDAO extends EgovComAbstractDAO {

	public List<CommunityVO> selectCommuMasterList(CommunityVO cmmntyVO) {
		return selectList("CommuMaster.selectCommuMasterList", cmmntyVO);
	}

	public int selectCommuMasterListCnt(CommunityVO cmmntyVO) {
		return selectOne("CommuMaster.selectCommuMasterListCnt", cmmntyVO);
	}

	public int insertCommuMaster(Community community) {
		return insert("CommuMaster.insertCommuMaster", community);
	}

	public CommunityVO selectCommuMasterDetail(CommunityVO cmmntyVO) {
		return selectOne("CommuMaster.selectCommuMasterDetail", cmmntyVO);
	}

	public int updateCommuMaster(Community community) {
		return update("CommuMaster.updateCommuMaster", community);
	}

	public int deleteCommuMaster(Community community) {
		return update("CommuMaster.deleteCommuMaster", community);
	}

	/**
	 * ?ы듃由우쓣 ?꾪븳 而ㅻ??덊떚 ?뺣낫 紐⑸줉 ?뺣낫瑜?議고쉶?쒕떎.
	 *
	 * @param cmmntyVO
	 * @return
	 * @throws Exception
	 */
	public List<CommunityVO> selectCommuMasterListPortlet(CommunityVO cmmntyVO) throws DataAccessException {
		return selectList("CommuMaster.selectCommuMasterListPortlet", cmmntyVO);
	}

}
