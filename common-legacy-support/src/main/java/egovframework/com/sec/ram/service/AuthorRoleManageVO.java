package egovframework.com.sec.ram.service;

import java.util.List;

/**
 * ???? ????Vo ?????? ???.
 * @author ???????? ??
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *   
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.03.20  ??          ????
 *
 * </pre>
 **/

public class AuthorRoleManageVO extends AuthorRoleManage {

	private static final long serialVersionUID = 1L;

	List <AuthorRoleManageVO> authorRoleList;
	
	/**
	 * authorRoleList attribute ?????.
	 * @return List<AuthorRoleManageVO>
	 **/
	public List<AuthorRoleManageVO> getAuthorRoleList() {
		return authorRoleList;
	}

	/**
	 * authorRoleList attribute ???????.
	 * @param authorRoleList List<AuthorRoleManageVO> 
	 **/
	public void setAuthorRoleList(List<AuthorRoleManageVO> authorRoleList) {
		this.authorRoleList = authorRoleList;
	}



}
