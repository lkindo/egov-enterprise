package egovframework.com.sec.ram.service;

import java.util.List;

/**
 * 沅뚰븳愿由ъ뿉 ???Vo ?대옒?ㅻ? ?뺤쓽?쒕떎.
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

public class AuthorManageVO extends AuthorManage {

	private static final long serialVersionUID = 1L;

	List <AuthorManageVO> authorManageList;


	/**
	 * authorManageList attribute 瑜?由ы꽩?쒕떎.
	 * @return List<AuthorManageVO>
	 */
	public List<AuthorManageVO> getAuthorManageList() {
		return authorManageList;
	}

	/**
	 * authorManageList attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param authorManageList List<AuthorManageVO> 
	 */
	public void setAuthorManageList(List<AuthorManageVO> authorManageList) {
		this.authorManageList = authorManageList;
	}



}
