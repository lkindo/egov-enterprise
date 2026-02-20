package egovframework.com.uss.ion.yrc.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.uss.ion.yrc.service.IndvdlYrycManage;

/**
 * 媛쒖슂
 * - ?곗감愿由ъ뿉 ???DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?곗감愿由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * @author ?닿린??
 * @version 1.0
 * @created 2014.11.14
 */

@Repository("indvdlYrycDAO")
public class IndvdlYrycDAO extends EgovComAbstractDAO {

	/**
	 * ?곗감瑜?議고쉶泥섎━?쒕떎.
	 * @param indvdlYrycManage - ?곗감愿由?model
	 */
	public List<IndvdlYrycManage> selectIndvdlYrycManageList(IndvdlYrycManage indvdlYrycManage) throws Exception {
		return selectList("indvdlYrycDAO.selectIndvdlYrycManageList", indvdlYrycManage);
	}

	/**
	 * ?곗감紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param indvdlYrycManage - ?곗감愿由?model
	 */
	public int selectIndvdlYrycManageListTotCnt(IndvdlYrycManage indvdlYrycManage) throws Exception {
		return (Integer)selectOne("indvdlYrycDAO.selectIndvdlYrycManageListTotCnt", indvdlYrycManage);
	}

	/**
	 * ?곗감瑜??낅젰泥섎━?쒕떎.
	 * @param indvdlYrycManage - ?곗감愿由?model
	 */
	public void insertIndvdlYrycManage(IndvdlYrycManage indvdlYrycManage) throws Exception {
		insert("indvdlYrycDAO.insertIndvdlYrycManage", indvdlYrycManage);
	}

	/**
	 * ?곗감瑜??섏젙泥섎━?쒕떎.
	 * @param indvdlYrycManage - ?곗감愿由?model
	 */
	public void updtIndvdlYrycManage(IndvdlYrycManage indvdlYrycManage) throws Exception {
		update("indvdlYrycDAO.updateIndvdlYrycManage", indvdlYrycManage);
	}

	/**
	 * ?곗감瑜???젣泥섎━?쒕떎.
	 * @param indvdlYrycManage - ?곗감愿由?model
	 */
	public void deleteIndvdlYrycManage(IndvdlYrycManage indvdlYrycManage) throws Exception {
		delete("indvdlYrycDAO.deleteIndvdlYrycManage", indvdlYrycManage);
	}

}
