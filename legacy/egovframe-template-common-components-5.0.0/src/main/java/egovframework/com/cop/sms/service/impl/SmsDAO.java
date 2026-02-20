 package egovframework.com.cop.sms.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.cop.sms.service.Sms;
import egovframework.com.cop.sms.service.SmsRecptn;
import egovframework.com.cop.sms.service.SmsVO;

/**
 * 臾몄옄硫붿떆吏瑜??꾪븳 ?곗씠???묎렐 ?대옒??
 * @author 怨듯넻而댄룷?뚰듃媛쒕컻? ?쒖꽦怨?
 * @since 2009.06.18
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.06.18  ?쒖꽦怨?         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@Repository("SmsDAO")
public class SmsDAO extends EgovComAbstractDAO {
	
    /**
     * 臾몄옄硫붿떆吏 紐⑸줉??議고쉶?쒕떎.
     * 
     * @param SmsVO
     * @return List<SmsVO>
     */
	public List<SmsVO> selectSmsInfs(SmsVO smsVO) {
        return selectList("SmsDAO.selectSmsInfs", smsVO);
    }

    /**
     * 臾몄옄硫붿떆吏 紐⑸줉 ?レ옄瑜?議고쉶?쒕떎
     * 
     * @param SmsVO
     * @return int
     */
	public int selectSmsInfsCnt(SmsVO smsVO) {
        return selectOne("SmsDAO.selectSmsInfsCnt", smsVO);
    }
    
    /**
     * 臾몄옄硫붿떆吏 ?뺣낫瑜??깅줉?쒕떎.
     * 
     * @param sms
     * @return int
     */
	public int insertSmsInf(Sms sms) {
        return insert("SmsDAO.insertSmsInf", sms);
    }
    
    /**
     * 臾몄옄硫붿떆吏 ?섏떊?뺣낫 諛?寃곌낵 ?뺣낫瑜??깅줉?쒕떎.
     * @param smsRecptn
     * @return int
     */
	public int insertSmsRecptnInf(SmsRecptn smsRecptn) {
        return insert("SmsDAO.insertSmsRecptnInf", smsRecptn);
    }
    
    /**
     * 臾몄옄硫붿떆吏??????곸꽭?뺣낫瑜?議고쉶?쒕떎.
     * 
     * @param smsVO
     * @return
     */
	public SmsVO selectSmsInf(SmsVO smsVO) {
        return selectOne("SmsDAO.selectSmsInf", smsVO);
    }
    
    /**
     * 臾몄옄硫붿떆吏 ?섏떊 諛?寃곌낵 紐⑸줉??議고쉶?쒕떎.
     * 
     * @param SmsRecptn
     * @return
     * @throws Exception
     */
	public List<SmsRecptn> selectSmsRecptnInfs(SmsRecptn smsRecptn) {
        return selectList("SmsDAO.selectSmsRecptnInfs", smsRecptn);
    }
    
    /**
     * 臾몄옄硫붿떆吏 ?꾩넚 寃곌낵 ?섏떊??泥섎━?쒕떎. EgovSmsInfoReceiver(Schedule job)???섑빐 ?몄텧?쒕떎.
     * 
     * @param smsRecptn
     * @return int
     */
	public int updateSmsRecptnInf(SmsRecptn smsRecptn) {
        return update("SmsDAO.updateSmsRecptnInf", smsRecptn);
    }
}
