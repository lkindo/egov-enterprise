package egovframework.com.sec.rmt.service;

import java.util.List;

import lombok.Getter;
import lombok.Setter;

/**
 * ?? ????Vo ?????? ???.
 * 
 * @author ???????? ??
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.03.20  ??          ????
 *   2025.06.26  ????         PMD???????? ????????-MethodReturnsInternalArray(??????? ?, ArrayIsStoredDirectly(????????
 *
 *      </pre>
 **/
public class RoleManageVO extends RoleManage {
	/**
	 * serialVersionUID
	 **/
	private static final long serialVersionUID = 1L;
	/**
	 * ??
	 **/
	List<RoleManageVO> roleManageList;
	/**
	 * ????????
	 **/
	@Getter
	@Setter
	String[] delYn;

	/**
	 * roleManageList attribute ?????.
	 * 
	 * @return List<RoleManageVO>
	 **/
	public List<RoleManageVO> getRoleManageList() {
		return roleManageList;
	}

	/**
	 * roleManageList attribute ???????.
	 * 
	 * @param roleManageList List<RoleManageVO>
	 **/
	public void setRoleManageList(List<RoleManageVO> roleManageList) {
		this.roleManageList = roleManageList;
	}

}
