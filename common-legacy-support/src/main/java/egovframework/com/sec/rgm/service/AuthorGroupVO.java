package egovframework.com.sec.rgm.service;

import java.util.List;

/**
 * ??????Vo ?????? ???.
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

public class AuthorGroupVO extends AuthorGroup {

	private static final long serialVersionUID = 1L;

	List <AuthorGroupVO> authorGroupList;

	/**
	 * authorGroupList attribute ?????.
	 * @return List<AuthorGroupVO>
	 **/
	public List<AuthorGroupVO> getAuthorGroupList() {
		return authorGroupList;
	}
	/**
	 * authorGroupList attribute ???????.
	 * @param authorGroupList List<AuthorGroupVO> 
	 **/
	public void setAuthorGroupList(List<AuthorGroupVO> authorGroupList) {
		this.authorGroupList = authorGroupList;
	}
	

}
