package egovframework.com.sec.ram.service;

import java.util.List;

/**
 * ?? ????Vo ?????? ???.
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

public class AuthorManageVO extends AuthorManage {

	private static final long serialVersionUID = 1L;

	List <AuthorManageVO> authorManageList;


	/**
	 * authorManageList attribute ?????.
	 * @return List<AuthorManageVO>
	 **/
	public List<AuthorManageVO> getAuthorManageList() {
		return authorManageList;
	}

	/**
	 * authorManageList attribute ???????.
	 * @param authorManageList List<AuthorManageVO> 
	 **/
	public void setAuthorManageList(List<AuthorManageVO> authorManageList) {
		this.authorManageList = authorManageList;
	}



}
