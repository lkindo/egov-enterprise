package egovframework.com.sec.ram.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.sec.ram.service.AuthorManage;
import egovframework.com.sec.ram.service.AuthorManageVO;
import egovframework.com.sec.ram.service.EgovAuthorManageService;
import jakarta.annotation.Resource;

/**
 * 沅뚰븳愿由ъ뿉 愿??ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
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

@Service("egovAuthorManageService")
public class EgovAuthorManageServiceImpl extends EgovAbstractServiceImpl implements EgovAuthorManageService {

	@Resource(name="authorManageDAO")
    private AuthorManageDAO authorManageDAO;

    /**
	 * 沅뚰븳 紐⑸줉??議고쉶?쒕떎.
	 * @param authorManageVO AuthorManageVO
	 * @return List<AuthorManageVO>
	 * @exception Exception
	 */
	@Override
    public List<AuthorManageVO> selectAuthorList(AuthorManageVO authorManageVO) throws Exception {
        return authorManageDAO.selectAuthorList(authorManageVO);
    }

	/**
	 * 沅뚰븳???깅줉?쒕떎.
	 * @param authorManage AuthorManage
	 * @exception Exception
	 */
	@Override
    public void insertAuthor(AuthorManage authorManage) throws Exception {
    	authorManageDAO.insertAuthor(authorManage);
    }

    /**
	 * 沅뚰븳???섏젙?쒕떎.
	 * @param authorManage AuthorManage
	 * @exception Exception
	 */
	@Override
    public void updateAuthor(AuthorManage authorManage) throws Exception {
    	authorManageDAO.updateAuthor(authorManage);
    }

    /**
	 * 沅뚰븳????젣?쒕떎.
	 * @param authorManage AuthorManage
	 * @exception Exception
	 */
	@Override
    public void deleteAuthor(AuthorManage authorManage) throws Exception {
    	authorManageDAO.deleteAuthor(authorManage);
    }

    /**
	 * 沅뚰븳??議고쉶?쒕떎.
	 * @param authorManageVO AuthorManageVO
	 * @return AuthorManageVO
	 * @exception Exception
	 */
	@Override
    public AuthorManageVO selectAuthor(AuthorManageVO authorManageVO) throws Exception {
    	AuthorManageVO resultVO = authorManageDAO.selectAuthor(authorManageVO);
        if (resultVO == null) {
			throw processException("info.nodata.msg");
		}
        return resultVO;
    }

    /**
	 * 沅뚰븳 紐⑸줉 移댁슫?몃? 議고쉶?쒕떎.
	 * @param authorManageVO AuthorManageVO
	 * @return int
	 * @exception Exception
	 */
	@Override
    public int selectAuthorListTotCnt(AuthorManageVO authorManageVO) throws Exception {
        return authorManageDAO.selectAuthorListTotCnt(authorManageVO);
    }

    /**
	 * 紐⑤뱺 沅뚰븳紐⑸줉??議고쉶?쒕떎.
	 * @param authorManageVO AuthorManageVO
	 * @return List<AuthorManageVO>
	 * @exception Exception
	 */
	@Override
	public List<AuthorManageVO> selectAuthorAllList(AuthorManageVO authorManageVO) throws Exception {
    	return authorManageDAO.selectAuthorAllList(authorManageVO);
    }
}
