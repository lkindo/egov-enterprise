package egovframework.com.sec.rgm.service;

import java.util.List;

/**
 * 沅뚰븳洹몃９?????Vo ?대옒?ㅻ? ?뺤쓽?쒕떎.
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

public class AuthorGroupVO extends AuthorGroup {

	private static final long serialVersionUID = 1L;

	List <AuthorGroupVO> authorGroupList;

	/**
	 * authorGroupList attribute 瑜?由ы꽩?쒕떎.
	 * @return List<AuthorGroupVO>
	 */
	public List<AuthorGroupVO> getAuthorGroupList() {
		return authorGroupList;
	}
	/**
	 * authorGroupList attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param authorGroupList List<AuthorGroupVO> 
	 */
	public void setAuthorGroupList(List<AuthorGroupVO> authorGroupList) {
		this.authorGroupList = authorGroupList;
	}
	

}