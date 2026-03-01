package egovframework.com.sec.drm.service;

import java.util.List;


/**
 * 遺?쒓텒?쒓?由ъ뿉 愿???쒕퉬???명꽣?섏씠???대옒?ㅻ? ?뺤쓽?쒕떎.
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

public interface EgovDeptAuthorService {

	/**
	 * 遺?쒕퀎 ?좊떦??沅뚰븳紐⑸줉 議고쉶
	 * @param deptAuthorVO DeptAuthorVO
	 * @return List<DeptAuthorVO>
	 * @exception Exception
	 */
	public List<DeptAuthorVO> selectDeptAuthorList(DeptAuthorVO deptAuthorVO) throws Exception;

	/**
	 * 遺?쒖뿉 ?대떦?섎뒗 ?ъ슜?먯뿉寃??쒖뒪??硫붾돱/?묎렐沅뚰븳???쇨큵 ?좊떦
	 * @param deptAuthor DeptAuthor
	 * @exception Exception
	 */
	public void insertDeptAuthor(DeptAuthor deptAuthor) throws Exception;

	/**
	 * 遺?쒕퀎 ?쒖뒪??硫붾돱 ?묎렐沅뚰븳???섏젙?섏뿬 ??ぉ???뺥빀?깆쓣 泥댄겕?섍퀬 ?섏젙???곗씠?곕? ?곗씠?곕쿋?댁뒪??諛섏쁺
	 * @param deptAuthor
	 * @exception Exception
	 */
	public void updateDeptAuthor(DeptAuthor deptAuthor) throws Exception;

	/**
	 * 遺덊븘?뷀븳 遺?쒓텒?쒕? 議고쉶?섏뿬 ?곗씠?곕쿋?댁뒪?먯꽌 ??젣
	 * @param deptAuthor DeptAuthor
	 * @exception Exception
	 */
	public void deleteDeptAuthor(DeptAuthor deptAuthor) throws Exception;

    /**
	 * 遺?쒓텒??紐⑸줉議고쉶 移댁슫?몃? 諛섑솚?쒕떎
	 * @param deptAuthorVO DeptAuthorVO
	 * @return int
	 * @exception Exception
	 */
	public int selectDeptAuthorListTotCnt(DeptAuthorVO deptAuthorVO) throws Exception;		
	
	/**
	 * 遺?쒕ぉ濡?議고쉶
	 * @param deptAuthorVO DeptAuthorVO
	 * @return List<DeptAuthorVO>
	 * @exception Exception
	 */
	public List<DeptAuthorVO> selectDeptList(DeptAuthorVO deptAuthorVO) throws Exception;	
	
    /**
	 * 遺??紐⑸줉議고쉶 移댁슫?몃? 諛섑솚?쒕떎
	 * @param deptAuthorVO DeptAuthorVO
	 * @return int
	 * @exception Exception
	 */
	public int selectDeptListTotCnt(DeptAuthorVO deptAuthorVO) throws Exception;	
}
