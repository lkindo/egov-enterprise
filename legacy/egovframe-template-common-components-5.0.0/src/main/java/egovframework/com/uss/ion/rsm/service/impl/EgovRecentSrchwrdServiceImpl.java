package egovframework.com.uss.ion.rsm.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;

import egovframework.com.uss.ion.rsm.service.EgovRecentSrchwrdService;
import egovframework.com.uss.ion.rsm.service.RecentSrchwrd;
import jakarta.annotation.Resource;

/**
 * 理쒓렐寃?됱뼱瑜?泥섎━?섎뒗 ServiceImpl Class 援ы쁽
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
@Service("egovRecentSrchwrdService")
public class EgovRecentSrchwrdServiceImpl extends EgovAbstractServiceImpl
        implements EgovRecentSrchwrdService {

    @Resource(name = "onlineRecentSrchwrdDao")
    private RecentSrchwrdDao dao;

    @Resource(name = "egovSrchwrdIdGnrService")
    private EgovIdGnrService egovSrchwrdIdGnrService;

    @Resource(name = "egovSrchwrdManageIdGnrService")
    private EgovIdGnrService egovSrchwrdManageIdGnrService;
    /**
     * 理쒓렐寃?됱뼱愿由щ?(?? 紐⑸줉??議고쉶 ?쒕떎.
     * @param searchVO 議고쉶???뺣낫媛 ?닿? VO
     * @return List
     * @throws Exception
     */
    @Override
	public List<EgovMap> selectRecentSrchwrdList(RecentSrchwrd searchVO) throws Exception {
        return dao.selectRecentSrchwrdList(searchVO);
    }

    /**
     * 理쒓렐寃?됱뼱愿由щ?(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
     * @param searchVO  議고쉶???뺣낫媛 ?닿릿 VO
     * @return int
     * @throws Exception
     */
    @Override
	public int selectRecentSrchwrdListCnt(RecentSrchwrd searchVO) throws Exception {
        return dao.selectRecentSrchwrdListCnt(searchVO);
    }

    /**
     * 理쒓렐寃?됱뼱愿由щ?(?? ?곸꽭議고쉶 ?쒕떎.
     * @param recentSrchwrd 理쒓렐寃?됱뼱愿由??뺣낫媛 ?닿? VO
     * @return List
     * @throws Exception
     */
    @Override
	public RecentSrchwrd selectRecentSrchwrdDetail( RecentSrchwrd recentSrchwrd) throws Exception {
        return dao.selectRecentSrchwrdDetail(recentSrchwrd);
    }

    /**
     * 理쒓렐寃?됱뼱愿由щ?(?? ?깅줉?쒕떎.
     * @param recentSrchwrd 理쒓렐寃?됱뼱愿由??뺣낫媛 ?닿? VO
     * @throws Exception
     */
    @Override
	public void insertRecentSrchwrd(RecentSrchwrd recentSrchwrd)throws Exception {
        String sMakeId = egovSrchwrdManageIdGnrService.getNextStringId();
        recentSrchwrd.setSrchwrdManageId(sMakeId);
        dao.insertRecentSrchwrd(recentSrchwrd);
    }

    /**
     * 理쒓렐寃?됱뼱愿由щ?(?? ?섏젙?쒕떎.
     * @param recentSrchwrd 理쒓렐寃?됱뼱愿由??뺣낫媛 ?닿? VO
     * @throws Exception
     */
    @Override
	public void updateRecentSrchwrd(RecentSrchwrd recentSrchwrd) throws Exception {
        dao.updateRecentSrchwrd(recentSrchwrd);
    }

    /**
     * 理쒓렐寃?됱뼱愿由щ?(?? ??젣?쒕떎.
     * @param recentSrchwrd 理쒓렐寃?됱뼱愿由??뺣낫媛 ?닿? VO
     * @throws Exception
     */
    @Override
	public void deleteRecentSrchwrd(RecentSrchwrd recentSrchwrd) throws Exception {
        dao.deleteRecentSrchwrd(recentSrchwrd);
    }


    /**
     * 理쒓렐寃?됱뼱寃곌낵瑜??? 紐⑸줉??議고쉶 ?쒕떎.
     * @param searchVO 議고쉶???뺣낫媛 ?닿? VO
     * @return List
     * @throws Exception
     */
    @Override
	public List<EgovMap> selectRecentSrchwrdResultInquire(RecentSrchwrd recentSrchwrd) throws Exception {
        return dao.selectRecentSrchwrdResultInquire(recentSrchwrd);
    }

    /**
     * 理쒓렐寃?됱뼱寃곌낵瑜??? 紐⑸줉??議고쉶 ?쒕떎.
     * @param searchVO 議고쉶???뺣낫媛 ?닿? VO
     * @return List
     * @throws Exception
     */
    @Override
	public List<?> selectRecentSrchwrdResultList(RecentSrchwrd searchVO) throws Exception {
        return dao.selectRecentSrchwrdResultList(searchVO);
    }

    /**
     * 理쒓렐寃?됱뼱寃곌낵瑜??? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
     * @param searchVO  議고쉶???뺣낫媛 ?닿릿 VO
     * @return int
     * @throws Exception
     */
    @Override
	public int selectRecentSrchwrdResultListCnt(RecentSrchwrd searchVO) throws Exception {
        return dao.selectRecentSrchwrdResultListCnt(searchVO);
    }

    /**
     * 理쒓렐寃?됱뼱寃곌낵瑜??? ?깅줉?쒕떎.
     * @param recentSrchwrd 理쒓렐寃?됱뼱愿由??뺣낫媛 ?닿? VO
     * @throws Exception
     */
    @Override
	public void insertRecentSrchwrdResult(RecentSrchwrd recentSrchwrd)throws Exception {
        String sMakeId = egovSrchwrdIdGnrService.getNextStringId();
        recentSrchwrd.setSrchwrdId(sMakeId);
        dao.insertRecentSrchwrdResult(recentSrchwrd);
    }

    /**
     * 理쒓렐寃?됱뼱寃곌낵瑜??? 嫄대퀎濡???젣 ?쒕떎.
     * @param recentSrchwrd  理쒓렐寃?됱뼱愿由??뺣낫媛 ?닿? VO
     * @throws Exception
     */
    @Override
	public void deleteRecentSrchwrdResult(RecentSrchwrd recentSrchwrd) throws Exception {
        dao.deleteRecentSrchwrdResult(recentSrchwrd);
    }

    /**
     * 理쒓렐寃?됱뼱寃곌낵瑜??? 愿由щ퀎濡???젣 ?쒕떎.
     * @param recentSrchwrd  理쒓렐寃?됱뼱愿由??뺣낫媛 ?닿? VO
     * @throws Exception
     */
    @Override
	public void deleteRecentSrchwrdResultAll(RecentSrchwrd recentSrchwrd) throws Exception {
        dao.deleteRecentSrchwrdResultAll(recentSrchwrd);
    }


}
