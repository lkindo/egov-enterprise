package egovframework.com.uat.uia.service;

import java.util.Map;

import egovframework.com.cmm.LoginVO;

/**
 * EgovLoginService ?대옒??
 * 
 * <p>
 * ?쇰컲 濡쒓렇?? ?몄쬆??濡쒓렇?몄쓣 泥섎━?섎뒗 鍮꾩쫰?덉뒪 ?명꽣?섏씠???대옒??
 * </p>
 * 
 * @author 怨듯넻?쒕퉬??媛쒕컻? 諛뺤???
 * @since 2009.03.06
 * @version 1.0
 * @see
 *  
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 * 
 *  ?섏젙??              ?섏젙??           ?섏젙?댁슜
 *  ----------   --------   ---------------------------
 *  2009.03.06   諛뺤???           理쒖큹 ?앹꽦 
 *  2011.08.26   ?쒖???           EsntlId瑜??댁슜??濡쒓렇??異붽?
 *  2017.07.21   ?λ룞??           濡쒓렇?몄씤利앹젣???묒뾽
 *  2020.07.08   ?좎슜??           鍮꾨?踰덊샇瑜??섏젙?쒗썑 寃쎄낵???좎쭨 議고쉶
 *  2021.05.30   ?뺤쭊??           ?붿??몄썝?⑥뒪 ?몄쬆 ?뚯썝 議고쉶
 *  </pre>
 */
public interface EgovLoginService {
	
	/**
     * 2011.08.26
	 * EsntlId瑜??댁슜??濡쒓렇?몄쓣 泥섎━?쒕떎
	 * @param vo LoginVO
	 * @return LoginVO
	 * @exception Exception
	 */
    public LoginVO actionLoginByEsntlId(LoginVO vo) throws Exception;
	
	/**
	 * ?쇰컲 濡쒓렇?몄쓣 泥섎━?쒕떎
	 * @param vo LoginVO
	 * @return LoginVO
	 * @exception Exception
	 */
    LoginVO actionLogin(LoginVO vo) throws Exception;
    
    /**
	 * ?몄쬆??濡쒓렇?몄쓣 泥섎━?쒕떎
	 * @param vo LoginVO
	 * @return LoginVO
	 * @exception Exception
	 */
    LoginVO actionCrtfctLogin(LoginVO vo) throws Exception;
    
    /**
	 * ?꾩씠?붾? 李얜뒗??
	 * @param vo LoginVO
	 * @return LoginVO
	 * @exception Exception
	 */
    LoginVO searchId(LoginVO vo) throws Exception;
    
    /**
	 * 鍮꾨?踰덊샇瑜?李얜뒗??
	 * @param vo LoginVO
	 * @return boolean
	 * @exception Exception
	 */
    boolean searchPassword(LoginVO vo) throws Exception;
    
    
    /**
	 * 濡쒓렇?몄씤利앹젣?쒖쓣 泥섎━?쒕떎.
	 * @param vo LoginVO
	 * @param Map mapLockUserInfo
	 * @return String
	 * @exception Exception
	 */
    String processLoginIncorrect(LoginVO vo, Map<?,?> mapLockUserInfo) throws Exception;
    
    /**
	 * 濡쒓렇?몄씤利앹젣?쒖쓣 議고쉶?쒕떎.
	 * @param vo LoginVO
	 * @return Map
	 * @exception Exception
	 */
    Map<?,?> selectLoginIncorrect(LoginVO vo) throws Exception;

    /**
	 * 鍮꾨?踰덊샇瑜??섏젙?쒗썑 寃쎄낵???좎쭨瑜?議고쉶?쒕떎.
	 * @param vo LoginVO
	 * @return int
	 * @exception Exception
	 */    
    int selectPassedDayChangePWD(LoginVO vo) throws Exception;

	/**
	 * ?붿??몄썝?⑥뒪 ?몄쬆 ?뚯썝 議고쉶?쒕떎.
	 * @param id
	 * @return LoginVO
	 * @exception Exception
	 */
    LoginVO onepassLogin(String id) throws Exception;
}
