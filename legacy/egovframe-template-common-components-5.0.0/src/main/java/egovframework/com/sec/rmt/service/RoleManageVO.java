package egovframework.com.sec.rmt.service;

import java.util.List;

import lombok.Getter;
import lombok.Setter;

/**
 * 濡ㅺ?由ъ뿉 ???Vo ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?대Ц以
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  ?대Ц以          理쒖큹 ?앹꽦
 *   2025.06.26  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-MethodReturnsInternalArray(硫붿꽌??諛섑솚 ?대? 諛곗뿴), ArrayIsStoredDirectly(諛곗뿴??吏곸젒 ??λ맖)
 *
 *      </pre>
 */
public class RoleManageVO extends RoleManage {
	/**
	 * serialVersionUID
	 */
	private static final long serialVersionUID = 1L;
	/**
	 * 濡?紐⑸줉
	 */
	List<RoleManageVO> roleManageList;
	/**
	 * ??젣???紐⑸줉
	 */
	@Getter
	@Setter
	String[] delYn;

	/**
	 * roleManageList attribute 瑜?由ы꽩?쒕떎.
	 * 
	 * @return List<RoleManageVO>
	 */
	public List<RoleManageVO> getRoleManageList() {
		return roleManageList;
	}

	/**
	 * roleManageList attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param roleManageList List<RoleManageVO>
	 */
	public void setRoleManageList(List<RoleManageVO> roleManageList) {
		this.roleManageList = roleManageList;
	}

}