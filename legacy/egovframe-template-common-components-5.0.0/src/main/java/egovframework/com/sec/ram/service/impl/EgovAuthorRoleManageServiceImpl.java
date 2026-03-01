package egovframework.com.sec.ram.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.sec.ram.service.AuthorRoleManage;
import egovframework.com.sec.ram.service.AuthorRoleManageVO;
import egovframework.com.sec.ram.service.EgovAuthorRoleManageService;
import jakarta.annotation.Resource;

/**
 * 沅뚰븳蹂?濡ㅺ?由ъ뿉 ???DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?대Ц以
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *  ?섏젙??              ?섏젙??             ?섏젙?댁슜
 *  ----------   ---------   ---------------------------
 *  2009.03.11   ?대Ц以              理쒖큹 ?앹꽦
 *  2021.02-09   ?좎슜??             updateAuthorRole ??젣
 *
 * </pre>
 */

@Service("egovAuthorRoleManageService")
public class EgovAuthorRoleManageServiceImpl extends EgovAbstractServiceImpl implements EgovAuthorRoleManageService {

	@Resource(name="authorRoleManageDAO")
    private AuthorRoleManageDAO authorRoleManageDAO;

	/**
	 * 沅뚰븳 濡?愿怨꾩젙蹂?紐⑸줉 議고쉶
	 * @param authorRoleManageVO AuthorRoleManageVO
	 * @return List<AuthorRoleManageVO>
	 * @exception Exception
	 */
	@Override
	public List<AuthorRoleManageVO> selectAuthorRoleList(AuthorRoleManageVO authorRoleManageVO) throws Exception {
		return authorRoleManageDAO.selectAuthorRoleList(authorRoleManageVO);
	}

	/**
	 * 沅뚰븳 濡?愿怨꾩젙蹂대? ?붾㈃?먯꽌 ?낅젰?섏뿬 ?낅젰??ぉ???뺥빀?깆쓣 泥댄겕?섍퀬 ?곗씠?곕쿋?댁뒪?????
	 * @param authorRoleManage AuthorRoleManage
	 * @exception Exception
	 */
	@Override
	public void insertAuthorRole(AuthorRoleManage authorRoleManage) throws Exception {
		authorRoleManageDAO.insertAuthorRole(authorRoleManage);
	}

	/**
	 * 沅뚰븳 濡?愿怨꾩젙蹂대? ?붾㈃??議고쉶?섏뿬 ?곗씠?곕쿋?댁뒪?먯꽌 ??젣
	 * @param authorRoleManage AuthorRoleManage
	 * @exception Exception
	 */
	@Override
	public void deleteAuthorRole(AuthorRoleManage authorRoleManage) throws Exception {
		authorRoleManageDAO.deleteAuthorRole(authorRoleManage);
	}

    /**
	 * 紐⑸줉議고쉶 移댁슫?몃? 諛섑솚?쒕떎
	 * @param authorRoleManageVO AuthorRoleManageVO
	 * @return int
	 * @exception Exception
	 */
	@Override
	public int selectAuthorRoleListTotCnt(AuthorRoleManageVO authorRoleManageVO) throws Exception {
		return authorRoleManageDAO.selectAuthorRoleListTotCnt(authorRoleManageVO);
	}
}
