package egovframework.com.cop.tpl.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.cop.tpl.service.TemplateInf;
import egovframework.com.cop.tpl.service.TemplateInfVO;

/**
 * ?쒗뵆由??뺣낫愿由щ? ?꾪븳 ?곗씠???묎렐 ?대옒??
 * @author 怨듯넻?쒕퉬?ㅺ컻諛쒗? ?댁궪??
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *  ?섏젙??              ?섏젙??           ?섏젙?댁슜
 *  ----------   --------   ---------------------------
 *  2009.03.17   ?댁궪??          理쒖큹 ?앹꽦
 *  2019.05.17   ?좎슜??          selectTemplateWhiteList() 異붽?
 *
 * </pre>
 */
@Repository("TemplateManageDAO")
public class TemplateManageDAO extends EgovComAbstractDAO {

    /**
     * ?쒗뵆由??뺣낫瑜???젣?쒕떎.
     * 
     * @param tmplatInf
     * @throws Exception
     */
    public void deleteTemplateInf(TemplateInf tmplatInf) throws Exception {
	update("TemplateManageDAO.deleteTemplateInf", tmplatInf);
    }

    /**
     * ?쒗뵆由??뺣낫瑜??깅줉?쒕떎.
     * 
     * @param tmplatInf
     * @throws Exception
     */
    public void insertTemplateInf(TemplateInf tmplatInf) throws Exception {
	insert("TemplateManageDAO.insertTemplateInf", tmplatInf);
    }

    /**
     * ?쒗뵆由??뺣낫瑜??섏젙?쒕떎.
     * 
     * @param tmplatInf
     * @throws Exception
     */
    public void updateTemplateInf(TemplateInf tmplatInf) throws Exception {
	update("TemplateManageDAO.updateTemplateInf", tmplatInf);
    }

    /**
     * ?쒗뵆由우뿉 ????붿씠?몃━?ㅽ듃 紐⑸줉瑜?議고쉶?쒕떎.
     * 
     * @param tmplatInfVO
     * @return
     * @throws Exception
     */
    public List<TemplateInfVO> selectTemplateWhiteList() throws Exception {
    	return selectList("TemplateManageDAO.selectTemplateWhiteList");
    }
    
    /**
     * ?쒗뵆由우뿉 ???紐⑸줉瑜?議고쉶?쒕떎.
     * 
     * @param tmplatInfVO
     * @return
     * @throws Exception
     */
    public List<TemplateInfVO> selectTemplateInfs(TemplateInfVO tmplatInfVO) throws Exception {
	return selectList("TemplateManageDAO.selectTemplateInfs", tmplatInfVO);
    }

    /**
     * ?쒗뵆由우뿉 ???紐⑸줉 ?꾩껜 嫄댁닔瑜?議고쉶?쒕떎.
     * 
     * @param tmplatInfVO
     * @return
     * @throws Exception
     */
    public int selectTemplateInfsCnt(TemplateInfVO tmplatInfVO) throws Exception {
	return (Integer)selectOne("TemplateManageDAO.selectTemplateInfsCnt", tmplatInfVO);
    }

    /**
     * ?쒗뵆由우뿉 ????곸꽭?뺣낫瑜?議고쉶?쒕떎.
     * 
     * @param tmplatInfVO
     * @return
     * @throws Exception
     */
    public TemplateInfVO selectTemplateInf(TemplateInfVO tmplatInfVO) throws Exception {
	return (TemplateInfVO)selectOne("TemplateManageDAO.selectTemplateInf", tmplatInfVO);

    }

    /**
     * ?쒗뵆由우뿉 ???誘몃━蹂닿린 ?뺣낫瑜?議고쉶?쒕떎.
     * 
     * @param tmplatInfVO
     * @return
     * @throws Exception
     */
    public TemplateInfVO selectTemplatePreview(TemplateInfVO tmplatInfVO) throws Exception {
	return null;
    }

    /**
     * ?쒗뵆由?援щ텇???곕Ⅸ 紐⑸줉??議고쉶?쒕떎.
     * 
     * @param tmplatInfVO
     * @return
     * @throws Exception
     */
    public List<TemplateInfVO> selectTemplateInfsByCode(TemplateInfVO tmplatInfVO) throws Exception {
	return selectList("TemplateManageDAO.selectTemplateInfsByCode", tmplatInfVO);
    }
	
}
