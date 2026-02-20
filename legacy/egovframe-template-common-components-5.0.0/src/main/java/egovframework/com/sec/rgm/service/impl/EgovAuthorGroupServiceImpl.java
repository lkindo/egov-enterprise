package egovframework.com.sec.rgm.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.sec.rgm.service.AuthorGroup;
import egovframework.com.sec.rgm.service.AuthorGroupVO;
import egovframework.com.sec.rgm.service.EgovAuthorGroupService;
import jakarta.annotation.Resource;

/**
 * 沅뚰븳洹몃９??愿??ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
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
 *   2024.10.29	LeeBaekHaeng	@Override ?쒓린
 *
 * </pre>
 */

@Service("egovAuthorGroupService")
public class EgovAuthorGroupServiceImpl  extends EgovAbstractServiceImpl implements EgovAuthorGroupService {

	@Resource(name="authorGroupDAO")
    private AuthorGroupDAO authorGroupDAO;

	/**
	 * 洹몃９蹂??좊떦??沅뚰븳 紐⑸줉 議고쉶
	 * @param authorGroupVO AuthorGroupVO
	 * @return List<AuthorGroupVO>
	 * @exception Exception
	 */
	@Override
	public List<AuthorGroupVO> selectAuthorGroupList(AuthorGroupVO authorGroupVO) throws Exception{
		return authorGroupDAO.selectAuthorGroupList(authorGroupVO);
	}

	/**
	 * 洹몃９??沅뚰븳?뺣낫瑜??좊떦?섏뿬 ?곗씠?곕쿋?댁뒪???깅줉
	 * @param authorGroup AuthorGroup
	 * @exception Exception
	 */
	@Override
	public void insertAuthorGroup(AuthorGroup authorGroup) throws Exception{
		authorGroupDAO.insertAuthorGroup(authorGroup);
	}

	/**
	 * ?붾㈃??議고쉶??洹몃９沅뚰븳?뺣낫瑜??섏젙?섏뿬 ??ぉ???뺥빀?깆쓣 泥댄겕?섍퀬 ?섏젙???곗씠?곕? ?곗씠?곕쿋?댁뒪??諛섏쁺
	 * @param authorGroup AuthorGroup
	 * @exception Exception
	 */
	@Override
	public void updateAuthorGroup(AuthorGroup authorGroup) throws Exception{
		authorGroupDAO.updateAuthorGroup(authorGroup);
	}

	/**
	 * 洹몃９蹂??좊떦???쒖뒪??硫붾돱 ?묎렐沅뚰븳????젣
	 * @param authorGroup AuthorGroup
	 * @exception Exception
	 */
	@Override
	public void deleteAuthorGroup(AuthorGroup authorGroup) throws Exception {
		authorGroupDAO.deleteAuthorGroup(authorGroup);
	}

    /**
	 * 紐⑸줉議고쉶 移댁슫?몃? 諛섑솚?쒕떎
	 * @param authorGroupVO AuthorGroupVO
	 * @return int
	 * @exception Exception
	 */
	@Override
	public int selectAuthorGroupListTotCnt(AuthorGroupVO authorGroupVO) throws Exception {
		return authorGroupDAO.selectAuthorGroupListTotCnt(authorGroupVO);
    }

}