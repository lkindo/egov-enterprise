package egovframework.com.sec.rgm.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.sec.rgm.service.AuthorGroup;
import egovframework.com.sec.rgm.service.AuthorGroupVO;

/**
 * 沅뚰븳洹몃９?????DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
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

@Repository("authorGroupDAO")
public class AuthorGroupDAO extends EgovComAbstractDAO {

	/**
	 * 洹몃９蹂??좊떦??沅뚰븳 紐⑸줉 議고쉶
	 * @param authorGroupVO AuthorGroupVO
	 * @return List<AuthorGroupVO>
	 * @exception Exception
	 */
	public List<AuthorGroupVO> selectAuthorGroupList(AuthorGroupVO authorGroupVO) throws Exception {
		return selectList("authorGroupDAO.selectAuthorGroupList", authorGroupVO);
	}
	
	/**
	 * 洹몃９??沅뚰븳?뺣낫瑜??좊떦?섏뿬 ?곗씠?곕쿋?댁뒪???깅줉
	 * @param authorGroup AuthorGroup
	 * @exception Exception
	 */
	public void insertAuthorGroup(AuthorGroup authorGroup) throws Exception {
		insert("authorGroupDAO.insertAuthorGroup", authorGroup);
	}
	
	/**
	 * ?붾㈃??議고쉶??洹몃９沅뚰븳?뺣낫瑜??섏젙?섏뿬 ??ぉ???뺥빀?깆쓣 泥댄겕?섍퀬 ?섏젙???곗씠?곕? ?곗씠?곕쿋?댁뒪??諛섏쁺
	 * @param authorGroup AuthorGroup
	 * @exception Exception
	 */
	public void updateAuthorGroup(AuthorGroup authorGroup) throws Exception {
		update("authorGroupDAO.updateAuthorGroup", authorGroup);
	}
	
	/**
	 * 洹몃９蹂??좊떦???쒖뒪??硫붾돱 ?묎렐沅뚰븳????젣
	 * @param authorGroup AuthorGroup
	 * @exception Exception
	 */
	public void deleteAuthorGroup(AuthorGroup authorGroup) throws Exception {
		delete("authorGroupDAO.deleteAuthorGroup", authorGroup);
	}

    /**
	 * 洹몃９沅뚰븳紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param authorGroupVO AuthorGroupVO
	 * @return int
	 * @exception Exception
	 */
    public int selectAuthorGroupListTotCnt(AuthorGroupVO authorGroupVO) throws Exception {
        return (Integer)selectOne("authorGroupDAO.selectAuthorGroupListTotCnt", authorGroupVO);
    }
}
