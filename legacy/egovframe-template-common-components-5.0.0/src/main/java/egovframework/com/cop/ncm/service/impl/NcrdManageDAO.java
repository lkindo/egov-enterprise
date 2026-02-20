package egovframework.com.cop.ncm.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.cop.ncm.service.NameCard;
import egovframework.com.cop.ncm.service.NameCardUser;
import egovframework.com.cop.ncm.service.NameCardVO;

/**
 * 紐낇븿?뺣낫瑜?愿由ы븯湲??꾪븳 ?곗씠???묎렐 ?대옒??
 * @author 怨듯넻?쒕퉬?ㅺ컻諛쒗? ?댁궪??
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??        ?섏젙??      ?섏젙?댁슜
 *  ----------    --------    ---------------------------
 *   2009.3.28     ?댁궪??      理쒖큹 ?앹꽦
 *
 * </pre>
 */
@Repository("NcrdManageDAO")
public class NcrdManageDAO extends EgovComAbstractDAO {

    // Logger log = Logger.getLogger(this.getClass());

    /**
     * 紐낇븿 ?뺣낫瑜???젣?쒕떎.
     *
     * @param nameCard
     * @throws Exception
     */
    public int deleteNcrdItemUser(NameCardVO nameCardVO){
        return delete("NcrdManageDAO.deleteNcrdItemUser", nameCardVO);
    }

    public int deleteNcrdItem(NameCardVO nameCardVO) {
        return delete("NcrdManageDAO.deleteNcrdItem", nameCardVO);
    }

    /**
     * 紐낇븿 ?뺣낫瑜??깅줉?쒕떎.
     *
     * @param nameCard
     * @throws Exception
     */
    public int insertNcrdItem(NameCard nameCard) {
        return insert("NcrdManageDAO.insertNcrdItem", nameCard);
    }

    /**
     * 紐낇븿?ъ슜???뺣낫瑜??깅줉?쒕떎.
     *
     * @param ncrdUser
     * @throws Exception
     */
    public int insertNcrdUseInf(NameCardUser ncrdUser) {
        return insert("NcrdManageDAO.insertNcrdUseInf", ncrdUser);
    }

    /**
     * 紐낇븿 ?뺣낫??????곸꽭?뺣낫瑜?議고쉶?쒕떎.
     *
     * @param nameCard
     * @return
     * @throws Exception
     */
    public NameCardVO selectNcrdItem(NameCard nameCard) {
        return selectOne("NcrdManageDAO.selectNcrdItem", nameCard);
    }

    /**
     * 紐낇븿 ?뺣낫?????紐⑸줉??議고쉶?쒕떎.
     *
     * @param nameCard
     * @return
     * @throws Exception
     */
    public List<NameCardVO> selectNcrdItemList(NameCardVO nameCardVO) {
        return selectList("NcrdManageDAO.selectNcrdItemList", nameCardVO);
    }

    /**
     *
     * @param nameCard
     * @return
     * @throws Exception
     */
    public int selectNcrdItemListCnt(NameCardVO nameCardVO) {
        return selectOne("NcrdManageDAO.selectNcrdItemListCnt", nameCardVO);
    }

    /**
     * 紐낇븿 ?뺣낫?????紐⑸줉 ?꾩껜 嫄댁닔瑜?議고쉶?쒕떎.
     *
     * @param nameCardUser
     * @return
     * @throws Exception
     */
    public List<NameCardUser> selectNcrdUseInfs(NameCardUser nameCardUser) {
        return selectList("NcrdManageDAO.selectNcrdUseInfs", nameCardUser);
    }

    /**
     * 紐낇븿?ъ슜???뺣낫?????紐⑸줉 ?꾩껜 嫄댁닔瑜?議고쉶?쒕떎.
     *
     * @param ncrdUser
     * @return
     * @throws Exception
     */
    public int selectNcrdUseInfsCnt(NameCardUser nameCardUser) {
        return selectOne("NcrdManageDAO.selectNcrdUseInfsCnt", nameCardUser);
    }

    /**
     * 紐낇븿 ?뺣낫瑜??섏젙?쒕떎.
     *
     * @param nameCard
     * @throws Exception
     */
    public int updateNcrdItem(NameCard nameCard) {
        return update("NcrdManageDAO.updateNcrdItem", nameCard);
    }

    /**
     * 紐낇븿?ъ슜???뺣낫瑜??섏젙?쒕떎.
     *
     * @param nameCardUser
     * @throws Exception
     */
    public int updateNcrdUseInf(NameCardUser nameCardUser) {
        return update("NcrdManageDAO.updateNcrdUseInf", nameCardUser);
    }

    /**
     * ??紐낇븿 ?뺣낫?????紐⑸줉??議고쉶?쒕떎.
     *
     * @param nameCardVO
     * @return
     * @throws Exception
     */
    public List<NameCardVO> selectMyNcrdItemList(NameCardVO nameCardVO) {
        return selectList("NcrdManageDAO.selectMyNcrdItemList", nameCardVO);
    }

    /**
     * ??紐낇븿 ?뺣낫?????紐⑸줉 ?꾩껜 嫄댁닔瑜?議고쉶?쒕떎.
     *
     * @param nameCardVO
     * @return
     * @throws Exception
     */
    public int selectMyNcrdItemListCnt(NameCardVO nameCardVO) {
        return selectOne("NcrdManageDAO.selectMyNcrdItemListCnt", nameCardVO);
    }
}
