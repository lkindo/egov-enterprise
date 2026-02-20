package egovframework.com.sec.rmt.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.sec.rmt.service.RoleManage;
import egovframework.com.sec.rmt.service.RoleManageVO;

/**
 * 濡ㅺ?由ъ뿉 ???DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
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

@Repository("roleManageDAO")
public class RoleManageDAO extends EgovComAbstractDAO {

	/**
	 * ?깅줉??濡??뺣낫 議고쉶
	 * @param roleManageVO RoleManageVO
	 * @return RoleManageVO
	 * @exception Exception
	 */
	public RoleManageVO selectRole(RoleManageVO roleManageVO) throws Exception {
		return (RoleManageVO) selectOne("roleManageDAO.selectRole", roleManageVO);
	}

	/**
	 * ?깅줉??濡??뺣낫 紐⑸줉 議고쉶
	 * @param roleManageVO RoleManageVO
	 * @return List<RoleManageVO>
	 * @exception Exception
	 */
	public List<RoleManageVO> selectRoleList(RoleManageVO roleManageVO) throws Exception {
		return selectList("roleManageDAO.selectRoleList", roleManageVO);
	}

	/**
	 * ?쒖뒪??硫붾돱???곕Ⅸ ?묎렐沅뚰븳, ?곗씠???낅젰, ?섏젙, ??젣??沅뚰븳 濡ㅼ쓣 ?깅줉
	 * @param roleManage RoleManage
	 * @exception Exception
	 */
	public void insertRole(RoleManage roleManage) throws Exception {
		insert("roleManageDAO.insertRole", roleManage);
	}
	/**
	 * ?쒖뒪??硫붾돱???곕Ⅸ ?묎렐沅뚰븳, ?곗씠???낅젰, ?섏젙, ??젣??沅뚰븳 濡ㅼ쓣 ?섏젙
	 * @param roleManage RoleManage
	 * @exception Exception
	 */
	public void updateRole(RoleManage roleManage) throws Exception {
		update("roleManageDAO.updateRole", roleManage);
	}
	/**
	 * 遺덊븘?뷀븳 濡ㅼ젙蹂대? ?붾㈃??議고쉶?섏뿬 ?곗씠?곕쿋?댁뒪?먯꽌 ??젣
	 * @param roleManage RoleManage
	 * @exception Exception
	 */
	public void deleteRole(RoleManage roleManage) throws Exception {
		delete("roleManageDAO.deleteRole", roleManage);
	}
	
    /**
	 * 濡ㅻぉ濡?珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param roleManageVO RoleManageVO
	 * @return int
	 * @exception Exception
	 */
    public int selectRoleListTotCnt(RoleManageVO roleManageVO) throws Exception {
        return (Integer)selectOne("roleManageDAO.selectAuthorListTotCnt", roleManageVO);
    }	
    
	/**
	 * ?깅줉??紐⑤뱺 濡??뺣낫 紐⑸줉 議고쉶
	 * @param roleManageVO RoleManageVO
	 * @return List<RoleManageVO>
	 * @exception Exception
	 */
	public List<RoleManageVO> selectRoleAllList(RoleManageVO roleManageVO) throws Exception {
		return selectList("roleManageDAO.selectRoleAllList", roleManageVO);
	}    

}