package egovframework.com.sec.drm.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.sec.drm.service.DeptAuthor;
import egovframework.com.sec.drm.service.DeptAuthorVO;

/**
 * 遺?쒓텒?쒖뿉 ???DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
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

@Repository("deptAuthorDAO")
public class DeptAuthorDAO extends EgovComAbstractDAO {

	/**
	 * 遺?쒕퀎 ?좊떦??沅뚰븳紐⑸줉 議고쉶
	 * @param deptAuthorVO DeptAuthorVO
	 * @return List<DeptAuthorVO>
	 * @exception Exception
	 */
	public List<DeptAuthorVO> selectDeptAuthorList(DeptAuthorVO deptAuthorVO) throws Exception {
		return selectList("deptAuthorDAO.selectDeptAuthorList", deptAuthorVO);
	}

	/**
	 * 遺?쒖뿉 ?대떦?섎뒗 ?ъ슜?먯뿉寃??쒖뒪??硫붾돱/?묎렐沅뚰븳???쇨큵 ?좊떦
	 * @param deptAuthor DeptAuthor
	 * @exception Exception
	 */
	public void insertDeptAuthor(DeptAuthor deptAuthor) throws Exception {
		insert("deptAuthorDAO.insertDeptAuthor", deptAuthor);
	}

	/**
	 * 遺?쒕퀎 ?쒖뒪??硫붾돱 ?묎렐沅뚰븳???섏젙?섏뿬 ??ぉ???뺥빀?깆쓣 泥댄겕?섍퀬 ?섏젙???곗씠?곕? ?곗씠?곕쿋?댁뒪??諛섏쁺
	 * @param deptAuthor DeptAuthor
	 * @exception Exception
	 */
	public void updateDeptAuthor(DeptAuthor deptAuthor) throws Exception {
		update("deptAuthorDAO.updateDeptAuthor", deptAuthor);
	}

	/**
	 * 遺덊븘?뷀븳 遺?쒓텒?쒕? 議고쉶?섏뿬 ?곗씠?곕쿋?댁뒪?먯꽌 ??젣
	 * @param deptAuthor DeptAuthor
	 * @exception Exception
	 */
	public void deleteDeptAuthor(DeptAuthor deptAuthor) throws Exception {
		delete("deptAuthorDAO.deleteDeptAuthor", deptAuthor);
	}

    /**
	 * 遺?쒓텒??紐⑸줉議고쉶 移댁슫?몃? 諛섑솚?쒕떎
	 * @param deptAuthorVO DeptAuthorVO
	 * @return int
	 * @exception Exception
	 */
	public int selectDeptAuthorListTotCnt(DeptAuthorVO deptAuthorVO) throws Exception {
		return (Integer)selectOne("deptAuthorDAO.selectDeptAuthorListTotCnt", deptAuthorVO);
	}

	/**
	 * 遺?쒕ぉ濡?議고쉶
	 * @param deptAuthorVO DeptAuthorVO
	 * @return List<DeptAuthorVO>
	 * @exception Exception
	 */
	public List<DeptAuthorVO> selectDeptList(DeptAuthorVO deptAuthorVO) throws Exception {
		return selectList("deptAuthorDAO.selectDeptList", deptAuthorVO);
	}
	
    /**
	 * 遺?쒕ぉ濡?議고쉶 移댁슫?몃? 諛섑솚?쒕떎
	 * @param deptAuthorVO DeptAuthorVO
	 * @return int
	 * @exception Exception
	 */
	public int selectDeptListTotCnt(DeptAuthorVO deptAuthorVO) throws Exception {
		return (Integer)selectOne("deptAuthorDAO.selectDeptListTotCnt", deptAuthorVO);
	}	
}