package egovframework.com.sec.rmt.service;

import java.util.List;


/**
 * 濡ㅺ?由ъ뿉 愿???쒕퉬???명꽣?섏씠???대옒?ㅻ? ?뺤쓽?쒕떎.
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

public interface EgovRoleManageService {

	/**
	 * ?깅줉??濡??뺣낫 議고쉶
	 * @param roleManageVO RoleManageVO
	 * @return RoleManageVO
	 * @exception Exception
	 */
	public RoleManageVO selectRole(RoleManageVO roleManageVO) throws Exception;

	/**
	 * ?깅줉??濡??뺣낫 紐⑸줉 議고쉶
	 * @param roleManageVO RoleManageVO
	 * @return List<RoleManageVO>
	 * @exception Exception
	 */
	public List<RoleManageVO> selectRoleList(RoleManageVO roleManageVO) throws Exception;

	/**
	 * 遺덊븘?뷀븳 濡ㅼ젙蹂대? ?붾㈃??議고쉶?섏뿬 ?곗씠?곕쿋?댁뒪?먯꽌 ??젣
	 * @param roleManage RoleManage
	 * @exception Exception
	 */
	public void deleteRole(RoleManage roleManage) throws Exception;
	
	/**
	 * ?쒖뒪??硫붾돱???곕Ⅸ ?묎렐沅뚰븳, ?곗씠???낅젰, ?섏젙, ??젣??沅뚰븳 濡ㅼ쓣 ?섏젙
	 * @param roleManage RoleManage
	 * @exception Exception
	 */
	public void updateRole(RoleManage roleManage) throws Exception;
	
	/**
	 * ?쒖뒪??硫붾돱???곕Ⅸ ?묎렐沅뚰븳, ?곗씠???낅젰, ?섏젙, ??젣??沅뚰븳 濡ㅼ쓣 ?깅줉
	 * @param roleManage RoleManage
	 * @param roleManageVO RoleManageVO
	 * @return RoleManageVO
	 * @exception Exception
	 */
	public RoleManageVO insertRole(RoleManage roleManage, RoleManageVO roleManageVO) throws Exception;
	
    /**
	 * 紐⑸줉議고쉶 移댁슫?몃? 諛섑솚?쒕떎
	 * @param roleManageVO RoleManageVO
	 * @return int
	 * @exception Exception
	 */
	public int selectRoleListTotCnt(RoleManageVO roleManageVO) throws Exception;
	
	/**
	 * ?깅줉??紐⑤뱺 濡??뺣낫 紐⑸줉 議고쉶
	 * @param roleManageVO RoleManageVO
	 * @return List<RoleManageVO>
	 * @exception Exception
	 */
	public List<RoleManageVO> selectRoleAllList(RoleManageVO roleManageVO) throws Exception;	

	
}
