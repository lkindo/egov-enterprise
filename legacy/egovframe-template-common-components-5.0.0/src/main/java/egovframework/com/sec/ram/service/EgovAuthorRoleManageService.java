package egovframework.com.sec.ram.service;

import java.util.List;

/**
 * 沅뚰븳蹂?濡?愿由ъ뿉 愿???쒕퉬???명꽣?섏씠???대옒?ㅻ? ?뺤쓽?쒕떎.
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?대Ц以
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *  ?섏젙??               ?섏젙??            ?섏젙?댁슜
 *  ----------   ---------   ---------------------------
 *  2009.03.20   ?대Ц以              理쒖큹 ?앹꽦
 *  2021.02-09   ?좎슜??             updateAuthorRole ??젣
 *
 * </pre>
 */

public interface EgovAuthorRoleManageService {

	/**
	 * 沅뚰븳 濡?愿怨꾩젙蹂?紐⑸줉 議고쉶
	 * @param authorRoleManageVO AuthorRoleManageVO
	 * @return List<AuthorRoleManageVO>
	 * @exception Exception
	 */
	public List<AuthorRoleManageVO> selectAuthorRoleList(AuthorRoleManageVO authorRoleManageVO) throws Exception;
	
	/**
	 * 沅뚰븳 濡?愿怨꾩젙蹂대? ?붾㈃?먯꽌 ?낅젰?섏뿬 ?낅젰??ぉ???뺥빀?깆쓣 泥댄겕?섍퀬 ?곗씠?곕쿋?댁뒪?????
	 * @param authorRoleManage AuthorRoleManage
	 * @exception Exception
	 */
	public void insertAuthorRole(AuthorRoleManage authorRoleManage) throws Exception;
	
	/**
	 * 沅뚰븳 濡?愿怨꾩젙蹂대? ?붾㈃??議고쉶?섏뿬 ?곗씠?곕쿋?댁뒪?먯꽌 ??젣
	 * @param authorRoleManage AuthorRoleManage
	 * @exception Exception
	 */
	public void deleteAuthorRole(AuthorRoleManage authorRoleManage) throws Exception;

    /**
	 * 紐⑸줉議고쉶 移댁슫?몃? 諛섑솚?쒕떎
	 * @param authorRoleManageVO AuthorRoleManageVO
	 * @return int
	 * @exception Exception
	 */
	public int selectAuthorRoleListTotCnt(AuthorRoleManageVO authorRoleManageVO) throws Exception;	

}
