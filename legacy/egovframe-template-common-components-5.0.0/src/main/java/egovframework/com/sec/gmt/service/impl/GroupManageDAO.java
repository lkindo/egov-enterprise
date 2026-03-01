package egovframework.com.sec.gmt.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.sec.gmt.service.GroupManage;
import egovframework.com.sec.gmt.service.GroupManageVO;

/**
 * 洹몃９愿由ъ뿉 ???DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?대Ц以
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.11  ?대Ц以          理쒖큹 ?앹꽦
 *
 * </pre>
 */

@Repository("groupManageDAO")
public class GroupManageDAO extends EgovComAbstractDAO {

	/**
	 * 寃?됱“嫄댁뿉 ?곕Ⅸ 洹몃９?뺣낫瑜?議고쉶
	 * @param groupManageVO GroupManageVO
	 * @return GroupManageVO
	 * @exception Exception
	 */
	public GroupManageVO selectGroup(GroupManageVO groupManageVO) throws Exception {
		return (GroupManageVO) selectOne("groupManageDAO.selectGroup", groupManageVO);
	}

	/**
	 * ?쒖뒪?쒖궗??紐⑹쟻蹂?洹몃９ 紐⑸줉 議고쉶
	 * @param groupManageVO GroupManageVO
	 * @return GroupManageVO
	 * @exception Exception
	 */
	public List<GroupManageVO> selectGroupList(GroupManageVO groupManageVO) throws Exception {
		return selectList("groupManageDAO.selectGroupList", groupManageVO);
	}

	/**
	 * 洹몃９ 湲곕낯?뺣낫瑜??붾㈃?먯꽌 ?낅젰?섏뿬 ??ぉ???뺥빀?깆쓣 泥댄겕?섍퀬 ?곗씠?곕쿋?댁뒪?????
	 * @param groupManage GroupManage
	 * @exception Exception
	 */
	public void insertGroup(GroupManage groupManage) throws Exception {
		insert("groupManageDAO.insertGroup", groupManage);
	}

	/**
	 * ?붾㈃??議고쉶??洹몃９??湲곕낯?뺣낫瑜??섏젙?섏뿬 ??ぉ???뺥빀?깆쓣 泥댄겕?섍퀬 ?섏젙???곗씠?곕? ?곗씠?곕쿋?댁뒪??諛섏쁺
	 * @param groupManage GroupManage
	 * @exception Exception
	 */
	public void updateGroup(GroupManage groupManage) throws Exception {
		update("groupManageDAO.updateGroup", groupManage);
	}
	
	/**
	 * 遺덊븘?뷀븳 洹몃９?뺣낫瑜??붾㈃??議고쉶?섏뿬 ?곗씠?곕쿋?댁뒪?먯꽌 ??젣
	 * @param groupManage GroupManage
	 * @exception Exception
	 */
	public void deleteGroup(GroupManage groupManage) throws Exception {
		delete("groupManageDAO.deleteGroup", groupManage);
	}

    /**
	 * 濡ㅻぉ濡?珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param groupManageVO GroupManageVO
	 * @return int
	 * @exception Exception
	 */
    public int selectGroupListTotCnt(GroupManageVO groupManageVO) throws Exception {
        return (Integer)selectOne("groupManageDAO.selectGroupListTotCnt", groupManageVO);
    }
}
