package egovframework.com.cop.com.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.cop.com.service.UserInfVO;

/**
 * ?묒뾽 ?쒖슜 ?ъ슜???뺣낫 議고쉶瑜??꾪븳 ?곗씠???묎렐 ?대옒??
 * @author 怨듯넻?쒕퉬?ㅺ컻諛쒗? ?댁궪??
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??         ?섏젙??      ?섏젙?댁슜
 *  -----------    --------    ---------------------------
 *   2009.04.06     ?댁궪??      理쒖큹 ?앹꽦
 *
 * </pre>
 */
@Repository("EgovUserInfManageDAO")
public class EgovUserInfManageDAO extends EgovComAbstractDAO {
    /**
     * ?ъ슜???뺣낫?????紐⑸줉??議고쉶?쒕떎.
     *
     * @param userVO
     * @return
     * @throws Exception
     */
    public List<UserInfVO> selectUserList(UserInfVO userVO) {
        return selectList("EgovUserInfManageDAO.selectUserList", userVO);
    }

    /**
     * ?ъ슜???뺣낫?????紐⑸줉 ?꾩껜 嫄댁닔瑜?議고쉶?쒕떎.
     *
     * @param userVO
     * @return
     * @throws Exception
     */
    public int selectUserListCnt(UserInfVO userVO) {
        return selectOne("EgovUserInfManageDAO.selectUserListCnt", userVO);
    }

    /**
     * 而ㅻ??덊떚 ?ъ슜??紐⑸줉??議고쉶?쒕떎.
     *
     * @param userVO
     * @return
     * @throws Exception
     */
    public List<UserInfVO> selectCmmntyUserList(UserInfVO userVO) {
        return selectList("EgovUserInfManageDAO.selectCmmntyUserList", userVO);
    }

    /**
     * 而ㅻ??덊떚 ?ъ슜??紐⑸줉??????꾩껜 嫄댁닔瑜?議고쉶?쒕떎.
     *
     * @param userVO
     * @return
     * @throws Exception
     */
    public int selectCmmntyUserListCnt(UserInfVO userVO) {
        return selectOne("EgovUserInfManageDAO.selectCmmntyUserListCnt", userVO);
    }

    /**
     * 而ㅻ??덊떚 愿由ъ옄 紐⑸줉??議고쉶?쒕떎.
     *
     * @param userVO
     * @return
     * @throws Exception
     */
    public List<UserInfVO> selectCmmntyMngrList(UserInfVO userVO) {
        return selectList("EgovUserInfManageDAO.selectCmmntyMngrList", userVO);
    }

    /**
     * 而ㅻ??덊떚 愿由ъ옄 紐⑸줉??????꾩껜 嫄댁닔瑜?議고쉶?쒕떎.
     *
     * @param userVO
     * @return
     * @throws Exception
     */
    public int selectCmmntyMngrListCnt(UserInfVO userVO) {
        return selectOne("EgovUserInfManageDAO.selectCmmntyMngrListCnt", userVO);
    }

    /**
     * ?숉샇???ъ슜??紐⑸줉??議고쉶?쒕떎.(?ъ슜?덊븿)
     *
     * @param userVO
     * @return
     * @throws Exception
     */
    public List<UserInfVO> selectClubUserList(UserInfVO userVO) throws Exception {
        return selectList("EgovUserInfManageDAO.selectClubUserList", userVO);
    }

    /**
     * ?숉샇???ъ슜??紐⑸줉??????꾩껜 嫄댁닔瑜?議고쉶?쒕떎.(?ъ슜?덊븿)
     *
     * @param userVO
     * @return
     * @throws Exception
     */
    public int selectClubUserListCnt(UserInfVO userVO) throws Exception {
        return selectOne("EgovUserInfManageDAO.selectClubUserListCnt", userVO);
    }

    /**
     * ?숉샇???댁쁺??紐⑸줉??議고쉶?쒕떎.(?ъ슜?덊븿)
     *
     * @param userVO
     * @return
     * @throws Exception
     */
    public List<UserInfVO> selectClubOprtrList(UserInfVO userVO) throws Exception {
        return selectList("EgovUserInfManageDAO.selectClubOprtrList", userVO);
    }

    /**
     * ?숉샇???댁쁺??紐⑸줉??????꾩껜 嫄댁닔瑜?議고쉶?쒕떎.(?ъ슜 ?덊븿)
     *
     * @param userVO
     * @return
     * @throws Exception
     */
    public int selectClubOprtrListCnt(UserInfVO userVO) throws Exception {
        return selectOne("EgovUserInfManageDAO.selectClubOprtrListCnt", userVO);
    }

    /**
     * ?숉샇?뚯뿉 ???紐⑤뱺 ?ъ슜??紐⑸줉??議고쉶?쒕떎.(?ъ슜 ?덊븿)
     *
     * @param userVO
     * @return
     * @throws Exception
     */
    public List<UserInfVO> selectAllClubUser(UserInfVO userVO) throws Exception {
        return selectList("EgovUserInfManageDAO.selectAllClubUser", userVO);
    }

    /**
     * 而ㅻ??덊떚?????紐⑤뱺 ?ъ슜??紐⑸줉??議고쉶?쒕떎.
     *
     * @param userVO
     * @return
     * @throws Exception
     */
    public List<UserInfVO> selectAllCmmntyUser(UserInfVO userVO) {
        return selectList("EgovUserInfManageDAO.selectAllCmmntyUser", userVO);
    }
}
