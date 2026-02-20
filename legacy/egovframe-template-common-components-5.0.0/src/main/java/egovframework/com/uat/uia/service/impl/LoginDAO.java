package egovframework.com.uat.uia.service.impl;

import java.util.Map;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.service.impl.EgovComAbstractDAO;

/**
 * ?쇰컲 濡쒓렇?? ?몄쬆??濡쒓렇?몄쓣 泥섎━?섎뒗 DAO ?대옒??
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
@Repository("loginDAO")
public class LoginDAO extends EgovComAbstractDAO {

    /**
     * 2011.08.26
	 * EsntlId瑜??댁슜??濡쒓렇?몄쓣 泥섎━?쒕떎
	 * @param vo LoginVO
	 * @return LoginVO
	 * @exception Exception
	 */
    public LoginVO actionLoginByEsntlId(LoginVO vo) throws Exception {
    	return (LoginVO)selectOne("LoginUsr.ssoLoginByEsntlId", vo);
    }

	/**
	 * ?쇰컲 濡쒓렇?몄쓣 泥섎━?쒕떎
	 * @param vo LoginVO
	 * @return LoginVO
	 * @exception Exception
	 */
    public LoginVO actionLogin(LoginVO vo) throws Exception {
    	return (LoginVO)selectOne("LoginUsr.actionLogin", vo);
    }

    /**
	 * ?몄쬆??濡쒓렇?몄쓣 泥섎━?쒕떎
	 * @param vo LoginVO
	 * @return LoginVO
	 * @exception Exception
	 */
    public LoginVO actionCrtfctLogin(LoginVO vo) throws Exception {

    	return (LoginVO)selectOne("LoginUsr.actionCrtfctLogin", vo);
    }

    /**
	 * ?꾩씠?붾? 李얜뒗??
	 * @param vo LoginVO
	 * @return LoginVO
	 * @exception Exception
	 */
    public LoginVO searchId(LoginVO vo) throws Exception {

    	return (LoginVO)selectOne("LoginUsr.searchId", vo);
    }

    /**
	 * 鍮꾨?踰덊샇瑜?李얜뒗??
	 * @param vo LoginVO
	 * @return LoginVO
	 * @exception Exception
	 */
    public LoginVO searchPassword(LoginVO vo) throws Exception {

    	return (LoginVO)selectOne("LoginUsr.searchPassword", vo);
    }

    /**
	 * 蹂寃쎈맂 鍮꾨?踰덊샇瑜???ν븳??
	 * @param vo LoginVO
	 * @exception Exception
	 */
    public void updatePassword(LoginVO vo) throws Exception {
    	update("LoginUsr.updatePassword", vo);
    }
    
    
    /**
	 * 濡쒓렇?몄씤利앹젣???댁뿭??議고쉶?쒕떎.
	 * @param vo LoginVO
	 * @return LoginVO
	 * @exception Exception
	 */
	public Map<?,?> selectLoginIncorrect(LoginVO vo) throws Exception {
    	return (Map<?,?>)selectOne("LoginUsr.selectLoginIncorrect", vo);
    }

    /**
	 * 濡쒓렇?몄씤利앹젣???댁뿭???낅뜲?댄듃 ?쒕떎.
	 * @param vo LoginVO
	 * @return vod
	 * @exception Exception
	 */
    public void updateLoginIncorrect(Map<?,?> map) throws Exception {
    	update("LoginUsr.updateLoginIncorrect"+map.get("USER_SE"), map);
    }
    
    /**
	 * 鍮꾨?踰덊샇瑜??섏젙?쒗썑 寃쎄낵???좎쭨瑜?議고쉶?쒕떎.
	 * @param vo LoginVO
	 * @return LoginVO
	 * @exception Exception
	 */
    public int selectPassedDayChangePWD(LoginVO vo) throws Exception {
    	return selectOne("LoginUsr.selectPassedDayChangePWD", vo);
    }

	/**
	 * ?붿??몄썝?⑥뒪 ?몄쬆 ?뚯썝 議고쉶?쒕떎.
	 * @param id
	 * @return LoginVO
	 * @exception Exception
	 */
    public LoginVO onepassLogin(String id) throws Exception {
    	return (LoginVO)selectOne("LoginUsr.onepassLogin", id);
    }

}
