package egovframework.com.sec.gmt.service;

import java.util.List;

/**
 * 洹몃９愿由ъ뿉 愿???쒕퉬???명꽣?섏씠???대옒?ㅻ? ?뺤쓽?쒕떎.
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
 *   2009.03.20  ?대Ц以          理쒖큹 ?앹꽦
 *
 * </pre>
 */

public interface EgovGroupManageService {

	/**
	 * 寃?됱“嫄댁뿉 ?곕Ⅸ 洹몃９?뺣낫瑜?議고쉶
	 * @param groupManageVO GroupManageVO
	 * @return GroupManageVO
	 * @exception Exception
	 */
	public GroupManageVO selectGroup(GroupManageVO groupManageVO) throws Exception;

	/**
	 * ?쒖뒪?쒖궗??紐⑹쟻蹂?洹몃９ 紐⑸줉 議고쉶
	 * @param groupManageVO GroupManageVO
	 * @return List<GroupManageVO>
	 * @exception Exception
	 */
	public List<GroupManageVO> selectGroupList(GroupManageVO groupManageVO) throws Exception;

	/**
	 * 洹몃９ 湲곕낯?뺣낫瑜??붾㈃?먯꽌 ?낅젰?섏뿬 ??ぉ???뺥빀?깆쓣 泥댄겕?섍퀬 ?곗씠?곕쿋?댁뒪?????
	 * @param groupManage GroupManage
	 * @param groupManageVO GroupManageVO
	 * @return GroupManageVO
	 * @exception Exception
	 */
	public GroupManageVO insertGroup(GroupManage groupManage, GroupManageVO groupManageVO) throws Exception;
	/**
	 * ?붾㈃??議고쉶??洹몃９??湲곕낯?뺣낫瑜??섏젙?섏뿬 ??ぉ???뺥빀?깆쓣 泥댄겕?섍퀬 ?섏젙???곗씠?곕? ?곗씠?곕쿋?댁뒪??諛섏쁺
	 * @param groupManage GroupManage
	 * @exception Exception
	 */
	public void updateGroup(GroupManage groupManage) throws Exception;
	
	/**
	 * 遺덊븘?뷀븳 洹몃９?뺣낫瑜??붾㈃??議고쉶?섏뿬 ?곗씠?곕쿋?댁뒪?먯꽌 ??젣
	 * @param groupManage GroupManage
	 * @exception Exception
	 */
	public void deleteGroup(GroupManage groupManage) throws Exception;
	
    /**
	 * 紐⑸줉議고쉶 移댁슫?몃? 諛섑솚?쒕떎
	 * @param groupManageVO GroupManageVO
	 * @return int
	 * @exception Exception
	 */
	public int selectGroupListTotCnt(GroupManageVO groupManageVO) throws Exception;	
}
