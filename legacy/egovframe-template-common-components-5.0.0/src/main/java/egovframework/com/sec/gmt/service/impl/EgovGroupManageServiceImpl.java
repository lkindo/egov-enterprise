package egovframework.com.sec.gmt.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.sec.gmt.service.EgovGroupManageService;
import egovframework.com.sec.gmt.service.GroupManage;
import egovframework.com.sec.gmt.service.GroupManageVO;
import jakarta.annotation.Resource;

/**
 * 洹몃９愿由ъ뿉 愿??ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
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

@Service("egovGroupManageService")
public class EgovGroupManageServiceImpl extends EgovAbstractServiceImpl implements EgovGroupManageService {

	@Resource(name="groupManageDAO")
    private GroupManageDAO groupManageDAO;

	/**
	 * ?쒖뒪?쒖궗??紐⑹쟻蹂?洹몃９ 紐⑸줉 議고쉶
	 * @param groupManageVO GroupManageVO
	 * @return List<GroupManageVO>
	 * @exception Exception
	 */
	@Override
	public List<GroupManageVO> selectGroupList(GroupManageVO groupManageVO) throws Exception {
		return groupManageDAO.selectGroupList(groupManageVO);
	}

	/**
	 * 寃?됱“嫄댁뿉 ?곕Ⅸ 洹몃９?뺣낫瑜?議고쉶
	 * @param groupManageVO GroupManageVO
	 * @return GroupManageVO
	 * @exception Exception
	 */
	@Override
	public GroupManageVO selectGroup(GroupManageVO groupManageVO) throws Exception {
		return groupManageDAO.selectGroup(groupManageVO);
	}

	/**
	 * 洹몃９ 湲곕낯?뺣낫瑜??붾㈃?먯꽌 ?낅젰?섏뿬 ??ぉ???뺥빀?깆쓣 泥댄겕?섍퀬 ?곗씠?곕쿋?댁뒪?????
	 * @param groupManage GroupManage
	 * @param groupManageVO GroupManageVO
	 * @return GroupManageVO
	 * @exception Exception
	 */
	@Override
	public GroupManageVO insertGroup(GroupManage groupManage, GroupManageVO groupManageVO) throws Exception {
		groupManageDAO.insertGroup(groupManage);
		groupManageVO.setGroupId(groupManage.getGroupId());
		return groupManageDAO.selectGroup(groupManageVO);
	}

	/**
	 * ?붾㈃??議고쉶??洹몃９??湲곕낯?뺣낫瑜??섏젙?섏뿬 ??ぉ???뺥빀?깆쓣 泥댄겕?섍퀬 ?섏젙???곗씠?곕? ?곗씠?곕쿋?댁뒪??諛섏쁺
	 * @param groupManage GroupManage
	 * @exception Exception
	 */
	@Override
	public void updateGroup(GroupManage groupManage) throws Exception {
		groupManageDAO.updateGroup(groupManage);
	}

	/**
	 * 遺덊븘?뷀븳 洹몃９?뺣낫瑜??붾㈃??議고쉶?섏뿬 ?곗씠?곕쿋?댁뒪?먯꽌 ??젣
	 * @param groupManage GroupManage
	 * @exception Exception
	 */
	@Override
	public void deleteGroup(GroupManage groupManage) throws Exception {
		groupManageDAO.deleteGroup(groupManage);
	}

    /**
	 * 紐⑸줉議고쉶 移댁슫?몃? 諛섑솚?쒕떎
	 * @param groupManageVO GroupManageVO
	 * @return int
	 * @exception Exception
	 */
	@Override
	public int selectGroupListTotCnt(GroupManageVO groupManageVO) throws Exception {
		return groupManageDAO.selectGroupListTotCnt(groupManageVO);
	}
}
