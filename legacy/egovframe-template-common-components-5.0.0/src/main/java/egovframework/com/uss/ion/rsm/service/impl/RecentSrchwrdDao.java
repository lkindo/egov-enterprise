package egovframework.com.uss.ion.rsm.service.impl;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.uss.ion.rsm.service.RecentSrchwrd;

/**
 * 理쒓렐寃?됱뼱瑜?泥섎━?섎뒗 Dao Class 援ы쁽
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2009.07.03
 * @version 1.0
 * @see <pre>
 * &lt;&lt; 媛쒖젙?대젰(Modification Information) &gt;&gt;
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.07.03  ?λ룞??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@Repository("onlineRecentSrchwrdDao")
public class RecentSrchwrdDao extends EgovComAbstractDAO {

    /**
     * 理쒓렐寃?됱뼱愿由щ?(?? 紐⑸줉???쒕떎.
     * @param searchVO  議고쉶???뺣낫媛 ?닿릿 VO
     * @return List
     * @throws Exception
     */
    public List<EgovMap> selectRecentSrchwrdList(RecentSrchwrd searchVO) throws Exception {
        return selectList("RecentSrchwrd.selectRecentSrchwrd", searchVO);
    }

    /**
     * 理쒓렐寃?됱뼱愿由щ?(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
     * @param searchVO  議고쉶???뺣낫媛 ?닿릿 VO
     * @return int
     * @throws Exception
     */
    public int selectRecentSrchwrdListCnt(RecentSrchwrd searchVO) throws Exception {
        return (Integer)selectOne("RecentSrchwrd.selectRecentSrchwrdCnt", searchVO);
    }

    /**
     * 理쒓렐寃?됱뼱愿由щ?(?? ?곸꽭議고쉶 ?쒕떎.
     * @param recentSrchwrdVO  理쒓렐寃?됱뼱 ?뺣낫媛 ?닿? VO
     * @return List
     * @throws Exception
     */
    public RecentSrchwrd selectRecentSrchwrdDetail(RecentSrchwrd recentSrchwrd) throws Exception {
        return (RecentSrchwrd)selectOne("RecentSrchwrd.selectRecentSrchwrdDetail", recentSrchwrd);
    }

    /**
     * 理쒓렐寃?됱뼱愿由щ?(?? ?깅줉?쒕떎.
     * @param qrecentSrchwrdVO  理쒓렐寃?됱뼱 ?뺣낫媛 ?닿? VO
     * @throws Exception
     */
    public void insertRecentSrchwrd(RecentSrchwrd recentSrchwrd) throws Exception {
        insert("RecentSrchwrd.insertRecentSrchwrd", recentSrchwrd);
    }

    /**
     * 理쒓렐寃?됱뼱愿由щ?(?? ?섏젙?쒕떎.
     * @param recentSrchwrdVO  理쒓렐寃?됱뼱 ?뺣낫媛 ?닿? VO
     * @throws Exception
     */
    public void updateRecentSrchwrd(RecentSrchwrd recentSrchwrd) throws Exception {
        update("RecentSrchwrd.updateRecentSrchwrd", recentSrchwrd);
    }

    /**
     * 理쒓렐寃?됱뼱愿由щ?(?? ??젣?쒕떎.
     * @param recentSrchwrdVO  理쒓렐寃?됱뼱 ?뺣낫媛 ?닿? VO
     * @throws Exception
     */
    public void deleteRecentSrchwrd(RecentSrchwrd recentSrchwrd) throws Exception {
        delete("RecentSrchwrd.deleteRecentSrchwrd", recentSrchwrd);
    }

    /**
     * 理쒓렐寃?됱뼱寃곌낵瑜??? 紐⑸줉???쒕떎.
     * @param recentSrchwrdVO  理쒓렐寃?됱뼱 ?뺣낫 ?닿? VO
     * @return List
     * @throws Exception
     */
    public List<EgovMap> selectRecentSrchwrdResultInquire(RecentSrchwrd recentSrchwrd) throws Exception {
        return selectList("RecentSrchwrd.selectRecentSrchwrdResultInquire", recentSrchwrd);
    }

    /**
     * 理쒓렐寃?됱뼱寃곌낵瑜??? 紐⑸줉???쒕떎.
     * @param recentSrchwrdVO  理쒓렐寃?됱뼱 ?뺣낫 ?닿? VO
     * @return List
     * @throws Exception
     */
    public List<?> selectRecentSrchwrdResultList(RecentSrchwrd searchVO) throws Exception {
        return selectList("RecentSrchwrd.selectRecentSrchwrdResult", searchVO);
    }

    /**
     * 理쒓렐寃?됱뼱寃곌낵瑜??? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
     * @param searchVO  議고쉶???뺣낫媛 ?닿릿 VO
     * @return int
     * @throws Exception
     */
    public int selectRecentSrchwrdResultListCnt(RecentSrchwrd searchVO) throws Exception {
        return (Integer)selectOne("RecentSrchwrd.selectRecentSrchwrdCntResult", searchVO);
    }

    /**
     * 理쒓렐寃?됱뼱寃곌낵瑜쇰?(?? ?깅줉?쒕떎.
     * @param recentSrchwrd  理쒓렐寃?됱뼱寃곌낵 ?뺣낫媛 ?닿? VO
     * @throws Exception
     */
    public void insertRecentSrchwrdResult(RecentSrchwrd recentSrchwrd) throws Exception {
        insert("RecentSrchwrd.insertRecentSrchwrdResult", recentSrchwrd);
    }

    /**
     * 理쒓렐寃?됱뼱寃곌낵 嫄대퀎 ??젣
     * @param recentSrchwrd  理쒓렐寃?됱뼱寃곌낵 ?뺣낫媛 ?닿? VO
     * @throws Exception
     */
    public void deleteRecentSrchwrdResult(RecentSrchwrd recentSrchwrd) throws Exception {
        delete("RecentSrchwrd.deleteRecentSrchwrdResult", recentSrchwrd);
    }

    /**
     * 理쒓렐寃?됱뼱寃곌낵 愿由щ퀎 ??젣
     * @param recentSrchwrd  理쒓렐寃?됱뼱寃곌낵 ?뺣낫媛 ?닿? VO
     * @throws Exception
     */
    public void deleteRecentSrchwrdResultAll(RecentSrchwrd recentSrchwrd) throws Exception {
        delete("RecentSrchwrd.deleteRecentSrchwrdResultAll", recentSrchwrd);
    }

}
