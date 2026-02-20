package egovframework.com.cop.stf.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.cop.bbs.service.Satisfaction;
import egovframework.com.cop.bbs.service.SatisfactionVO;

/**
 * 留뚯”?꾩“?щ? ?꾪븳 ?곗씠???묎렐 ?대옒??
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
 *
 * </pre>
 */
@Repository("BBSSatisfactionDAO")
public class BBSSatisfactionDAO extends EgovComAbstractDAO {

    /**
     * 留뚯”?꾩“?ъ뿉 ???紐⑸줉??議고쉶 ?쒕떎.
     * 
     * @param satisfactionVO
     * @return
     * @throws Exception
     */
    public List<SatisfactionVO> selectSatisfactionList(SatisfactionVO satisfactionVO) throws Exception {
	return selectList("BBSSatisfactionDAO.selectSatisfactionList", satisfactionVO);
    }
    
    /**
     * 留뚯”?꾩“?ъ뿉 ???紐⑸줉 嫄댁닔瑜?議고쉶 ?쒕떎.
     * 
     * @param satisfactionVO
     * @return
     * @throws Exception
     */
    public int selectSatisfactionListCnt(SatisfactionVO satisfactionVO) throws Exception {
	return (Integer)selectOne("BBSSatisfactionDAO.selectSatisfactionListCnt", satisfactionVO);
    }
    
    /**
     * 留뚯”?꾩“?щ? ?깅줉?쒕떎.
     * 
     * @param satisfaction
     * @throws Exception
     */
    public void insertSatisfaction(Satisfaction satisfaction) throws Exception {	
	insert("BBSSatisfactionDAO.insertSatisfaction", satisfaction);
    }
    
    /**
     * 留뚯”?꾩“?щ? ??젣?쒕떎.
     * 
     * @param satisfactionVO
     * @throws Exception
     */
    public void deleteSatisfaction(SatisfactionVO satisfactionVO) throws Exception {
	update("BBSSatisfactionDAO.deleteSatisfaction", satisfactionVO);
    }
    
    /**
     * 留뚯”?꾩“?ъ뿉 ????댁슜??議고쉶?쒕떎.
     * 
     * @param satisfactionVO
     * @return
     * @throws Exception
     */
    public Satisfaction selectSatisfaction(SatisfactionVO satisfactionVO) throws Exception {
	return (Satisfaction)selectOne("BBSSatisfactionDAO.selectSatisfaction", satisfactionVO);
    }
    
    /**
     * 留뚯”?꾩“?ъ뿉 ????댁슜???섏젙?쒕떎.
     * 
     * @param satisfaction
     * @throws Exception
     */
    public void updateSatisfaction(Satisfaction satisfaction) throws Exception {	
	insert("BBSSatisfactionDAO.updateSatisfaction", satisfaction);
    }
    
    /**
     * 留뚯”?꾩“?ъ뿉 ????⑥뒪?뚮뱶瑜?議고쉶 ?쒕떎.
     * 
     * @param satisfaction
     * @return
     * @throws Exception
     */
    public String getSatisfactionPassword(Satisfaction satisfaction) throws Exception {
	return (String)selectOne("BBSSatisfactionDAO.getSatisfactionPassword", satisfaction);
    }
    
    /**
     * 留뚯”???꾩껜 ?먯닔瑜??쒓났?쒕떎.
     * 
     * @param satisfactionVO
     * @return
     * @throws Exception
     */
    public Float getSummary(SatisfactionVO satisfactionVO) throws Exception {
	return (Float)selectOne("BBSSatisfactionDAO.getSummary", satisfactionVO);
    }
}
