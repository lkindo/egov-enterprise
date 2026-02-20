package egovframework.com.sec.ram.service;

import java.util.List;

/**
 * 沅뚰븳愿由ъ뿉 愿???쒕퉬???명꽣?섏씠???대옒?ㅻ? ?뺤쓽?쒕떎.
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

public interface EgovAuthorManageService {
    /**
	 * 紐⑤뱺 沅뚰븳紐⑸줉??議고쉶?쒕떎.
	 * @param authorManageVO AuthorManageVO
	 * @return List<AuthorManageVO>
	 * @exception Exception
	 */
	public List<AuthorManageVO> selectAuthorAllList(AuthorManageVO authorManageVO) throws Exception;
	
	/**
	 * ?쒖뒪???ъ슜?먯쨷 遺덊븘?뷀븳 ?쒖뒪?쒓텒?쒖젙蹂대? ?붾㈃??議고쉶?섏뿬 ?곗씠?곕쿋?댁뒪?먯꽌 ??젣
	 * @param authorManage AuthorManage
	 * @exception Exception
	 */
	public void deleteAuthor(AuthorManage authorManage) throws Exception;

	/**
	 * ?ъ슜?먯쓽 ?쒖뒪?뚯젒洹쇨텒?쒕? ?붾㈃?먯꽌 ?낅젰?섏뿬 ?낅젰??ぉ???뺥빀?깆쓣 泥댄겕?섍퀬 ?곗씠?곕쿋?댁뒪?????
	 * @param authorManage AuthorManage
	 * @exception Exception
	 */
	public void insertAuthor(AuthorManage authorManage) throws Exception;

	/**
	 * 媛쒕퀎?ъ슜?먯뿉寃??좊떦??沅뚰븳 議고쉶
	 * @param authorManageVO AuthorManageVO
	 * @exception Exception
	 */
	public AuthorManageVO selectAuthor(AuthorManageVO authorManageVO) throws Exception;

	/**
	 * 媛쒕퀎?ъ슜?먯뿉寃??좊떦??沅뚰븳由ъ뒪??議고쉶
	 * @param authorManageVO AuthorManageVO
	 * @return List<AuthorManageVO>
	 * @exception Exception
	 */
	public List<AuthorManageVO> selectAuthorList(AuthorManageVO authorManageVO) throws Exception;

	/**
	 * ?붾㈃??議고쉶???ъ슜?먭텒?쒖젙蹂대? ?섏젙?섏뿬 ??ぉ???뺥빀?깆쓣 泥댄겕?섍퀬 ?섏젙???곗씠?곕? ?곗씠?곕쿋?댁뒪??諛섏쁺
 	 * @param authorManage AuthorManage
	 * @exception Exception
	 */
	public void updateAuthor(AuthorManage authorManage) throws Exception;
	
    /**
	 * 紐⑸줉議고쉶 移댁슫?몃? 諛섑솚?쒕떎
	 * @param authorManageVO AuthorManageVO
	 * @return int
	 * @exception Exception
	 */
	public int selectAuthorListTotCnt(AuthorManageVO authorManageVO) throws Exception;	
	
}
