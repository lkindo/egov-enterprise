package egovframework.com.cop.bbs.service.impl;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.cop.bbs.service.BoardMaster;
import egovframework.com.cop.bbs.service.BoardMasterVO;

/**
 * 2?④퀎 湲곕뒫 異붽? (?볤?愿由? 留뚯”?꾩“?? 愿由щ? ?꾪븳 ?곗씠???묎렐 ?대옒??
 * @author 怨듯넻而댄룷?뚰듃媛쒕컻? ?쒖꽦怨?
 * @since 2009.06.26
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.06.26  ?쒖꽦怨?         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@Repository("BBSAddedOptionsDAO")
public class BBSAddedOptionsDAO extends EgovComAbstractDAO {

    /**
     * ?좉퇋 寃뚯떆??異붽?湲곕뒫 ?뺣낫瑜??깅줉?쒕떎.
     * 
     * @param BoardMaster
     */
    public String insertAddedOptionsInf(BoardMaster boardMaster) throws Exception {
	return Integer.toString(insert("BBSAddedOptions.insertAddedOptionsInf", boardMaster));
    }
    
    /**
     * 寃뚯떆??異붽?湲곕뒫 ?뺣낫 ??嫄댁쓣 ?곸꽭議고쉶 ?쒕떎.
     * 
     * @param BoardMasterVO
     */
    public BoardMasterVO selectAddedOptionsInf(BoardMaster vo) throws Exception {
	return (BoardMasterVO)selectOne("BBSAddedOptions.selectAddedOptionsInf", vo);
    }
    
    /**
     * 寃뚯떆??異붽?湲곕뒫 ?뺣낫瑜??섏젙?쒕떎.
     * 
     * @param BoardMaster
     */
    public void updateAddedOptionsInf(BoardMaster boardMaster) throws Exception {
	update("BBSAddedOptions.updateAddedOptionsInf", boardMaster);
    }
}
