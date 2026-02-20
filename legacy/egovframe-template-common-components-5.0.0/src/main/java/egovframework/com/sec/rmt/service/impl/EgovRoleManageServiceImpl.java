package egovframework.com.sec.rmt.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.sec.rmt.service.EgovRoleManageService;
import egovframework.com.sec.rmt.service.RoleManage;
import egovframework.com.sec.rmt.service.RoleManageVO;
import jakarta.annotation.Resource;

/**
 * 濡ㅺ?由ъ뿉 愿??ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
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

@Service("egovRoleManageService")
public class EgovRoleManageServiceImpl extends EgovAbstractServiceImpl implements EgovRoleManageService {

	@Resource(name="roleManageDAO")
	public RoleManageDAO roleManageDAO;

	/**
	 * ?깅줉??濡??뺣낫 議고쉶
	 * @param roleManageVO RoleManageVO
	 * @return RoleManageVO
	 * @exception Exception
	 */
	@Override
	public RoleManageVO selectRole(RoleManageVO roleManageVO) throws Exception {
		return roleManageDAO.selectRole(roleManageVO);
	}

	/**
	 * ?깅줉??濡??뺣낫 紐⑸줉 議고쉶
	 * @param roleManageVO RoleManageVO
	 * @return List<RoleManageVO>
	 * @exception Exception
	 */
	@Override
	public List<RoleManageVO> selectRoleList(RoleManageVO roleManageVO) throws Exception {
		return roleManageDAO.selectRoleList(roleManageVO);
	}

	/**
	 * 遺덊븘?뷀븳 濡ㅼ젙蹂대? ?붾㈃??議고쉶?섏뿬 ?곗씠?곕쿋?댁뒪?먯꽌 ??젣
	 * @param roleManage RoleManage
	 * @exception Exception
	 */
	@Override
	public void deleteRole(RoleManage roleManage) throws Exception {
		roleManageDAO.deleteRole(roleManage);
	}

	/**
	 * ?쒖뒪??硫붾돱???곕Ⅸ ?묎렐沅뚰븳, ?곗씠???낅젰, ?섏젙, ??젣??沅뚰븳 濡ㅼ쓣 ?섏젙
	 * @param roleManage RoleManage
	 * @exception Exception
	 */
	@Override
	public void updateRole(RoleManage roleManage) throws Exception {
		roleManageDAO.updateRole(roleManage);
	}

	/**
	 * ?쒖뒪??硫붾돱???곕Ⅸ ?묎렐沅뚰븳, ?곗씠???낅젰, ?섏젙, ??젣??沅뚰븳 濡ㅼ쓣 ?깅줉
	 * @param roleManage RoleManage
	 * @param roleManageVO RoleManageVO
	 * @return RoleManageVO
	 * @exception Exception
	 */
	@Override
	public RoleManageVO insertRole(RoleManage roleManage, RoleManageVO roleManageVO) throws Exception {
		roleManageDAO.insertRole(roleManage);
		roleManageVO.setRoleCode(roleManage.getRoleCode());
		return roleManageDAO.selectRole(roleManageVO);
	}

    /**
	 * 紐⑸줉議고쉶 移댁슫?몃? 諛섑솚?쒕떎
	 * @param roleManageVO RoleManageVO
	 * @return int
	 * @exception Exception
	 */
	@Override
	public int selectRoleListTotCnt(RoleManageVO roleManageVO) throws Exception {
		return roleManageDAO.selectRoleListTotCnt(roleManageVO);
	}

	/**
	 * ?깅줉??紐⑤뱺 濡??뺣낫 紐⑸줉 議고쉶
	 * @param roleManageVO - ?깅줉???뺣낫媛 ?닿릿 RoleManageVO
	 * @return List
	 * @exception Exception
	 */
	@Override
	public List<RoleManageVO> selectRoleAllList(RoleManageVO roleManageVO) throws Exception {
		return roleManageDAO.selectRoleAllList(roleManageVO);
	}

}