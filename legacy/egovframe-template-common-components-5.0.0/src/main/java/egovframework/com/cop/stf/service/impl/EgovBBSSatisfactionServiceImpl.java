package egovframework.com.cop.stf.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import egovframework.com.cop.bbs.service.BoardMaster;
import egovframework.com.cop.bbs.service.BoardMasterVO;
import egovframework.com.cop.bbs.service.EgovBBSSatisfactionService;
import egovframework.com.cop.bbs.service.Satisfaction;
import egovframework.com.cop.bbs.service.SatisfactionVO;
import egovframework.com.cop.bbs.service.impl.BBSAddedOptionsDAO;
import jakarta.annotation.Resource;

/**
 * 留뚯”?꾩“?щ? ?꾪븳 ?쒕퉬??援ы쁽 ?대옒??
 * @author 怨듯넻而댄룷?뚰듃媛쒕컻? ?쒖꽦怨?
 * @since 2009.06.29
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.06.29  ?쒖꽦怨?         理쒖큹 ?앹꽦
 *   2011.09.15  ?쒖???         addedOptions ?곸슜 諛⑸쾿 ?섏젙
 *   2011.10.18  ?쒖???         StsfdgNo ?먮룞 ?앹꽦 諛⑹떇?쇰줈 蹂寃?
 * </pre>
 */
@Service("EgovBBSSatisfactionService")
public class EgovBBSSatisfactionServiceImpl extends EgovAbstractServiceImpl implements EgovBBSSatisfactionService {

    @Resource(name = "BBSAddedOptionsDAO")
    private BBSAddedOptionsDAO addedOptionsDAO;

    @Resource(name = "BBSSatisfactionDAO")
    private BBSSatisfactionDAO bbsSatisfactionDAO;

    @Resource(name = "egovStsfdgNoGnrService")
    private EgovIdGnrService egovStsfdgNoGnrService;

    /**
     * 留뚯”?꾩“???ъ슜 媛???щ?瑜??뺤씤?쒕떎.
     */
    @Override
	public boolean canUseSatisfaction(String bbsId) throws Exception {
	//String flag = EgovProperties.getProperty("Globals.addedOptions");
	//if (flag != null && flag.trim().equalsIgnoreCase("true")) {//2011.09.15
	    BoardMaster vo = new BoardMaster();

	    vo.setBbsId(bbsId);

	    BoardMasterVO options = addedOptionsDAO.selectAddedOptionsInf(vo);

	    if (options == null) {
		return false;
	    }

	    if (options.getStsfdgAt().equals("Y")) {
		return true;
	    }
	//
                    }

	return false;
    }

    /**
     * 留뚯”?꾩“?ъ뿉 ???紐⑸줉??議고쉶 ?쒕떎.
     */
    @Override
	public Map<String, Object> selectSatisfactionList(SatisfactionVO satisfactionVO) throws Exception {
	List<SatisfactionVO> result = bbsSatisfactionDAO.selectSatisfactionList(satisfactionVO);
	int cnt = bbsSatisfactionDAO.selectSatisfactionListCnt(satisfactionVO);
	float summary = bbsSatisfactionDAO.getSummary(satisfactionVO);

	Map<String, Object> map = new HashMap<>();

	map.put("resultList", result);
	map.put("resultCnt", Integer.toString(cnt));
	map.put("summary", Float.toString(summary));

	return map;
    }

    /**
     * 留뚯”?꾩“?щ? ?깅줉?쒕떎.
     */
    @Override
	public void insertSatisfaction(Satisfaction satisfaction) throws Exception {

    satisfaction.setStsfdgNo(egovStsfdgNoGnrService.getNextLongId() + "");//2011.10.18
	bbsSatisfactionDAO.insertSatisfaction(satisfaction);
    }

    /**
     * 留뚯”?꾩“?щ? ??젣?쒕떎.
     */
    @Override
	public void deleteSatisfaction(SatisfactionVO satisfactionVO) throws Exception {
	bbsSatisfactionDAO.deleteSatisfaction(satisfactionVO);
    }

    /**
     * 留뚯”?꾩“?ъ뿉 ????댁슜??議고쉶?쒕떎.
     */
    @Override
	public Satisfaction selectSatisfaction(SatisfactionVO satisfactionVO) throws Exception {
	return bbsSatisfactionDAO.selectSatisfaction(satisfactionVO);
    }

    /**
     * 留뚯”?꾩“?ъ뿉 ????댁슜???섏젙?쒕떎.
     */
    @Override
	public void updateSatisfaction(Satisfaction satisfaction) throws Exception {
	bbsSatisfactionDAO.updateSatisfaction(satisfaction);
    }

    /**
     * 留뚯”?꾩“???⑥뒪?뚮뱶瑜?媛?몄삩??
     */
    @Override
	public String getSatisfactionPassword(Satisfaction satisfaction) throws Exception {
	return bbsSatisfactionDAO.getSatisfactionPassword(satisfaction);
    }
}
