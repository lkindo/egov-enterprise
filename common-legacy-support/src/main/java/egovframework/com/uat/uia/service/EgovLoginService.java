package egovframework.com.uat.uia.service;

import java.util.Map;

import egovframework.com.cmm.LoginVO;

/**
 * EgovLoginService ?????
 * 
 * <p>
 * ?? ??? ????? ??? ???? ??????????
 * </p>
 * 
 * @author ???????? ???
 * @since 2009.03.06
 * @version 1.0
 * @see
 *  
 * <pre>
 * << ?????Modification Information) >>
 * 
 *  ????              ????           ????
 *  ----------   --------   ---------------------------
 *  2009.03.06   ???           ???? 
 *  2011.08.26   ?????           EsntlId???????????
 *  2017.07.21   ???           ??????
 *  2020.07.08   ???           ????????? ????? ??
 *  2021.05.30   ???           ????? ? ??? ??
 *  </pre>
 **/
public interface EgovLoginService {
	
	/**
     * 2011.08.26
	 * EsntlId???????? ???
	 * @param vo LoginVO
	 * @return LoginVO
	 * @exception Exception
	 **/
    public LoginVO actionLoginByEsntlId(LoginVO vo) throws Exception;
	
	/**
	 * ?? ?? ???
	 * @param vo LoginVO
	 * @return LoginVO
	 * @exception Exception
	 **/
    LoginVO actionLogin(LoginVO vo) throws Exception;
    
    /**
	 * ????? ???
	 * @param vo LoginVO
	 * @return LoginVO
	 * @exception Exception
	 **/
    LoginVO actionCrtfctLogin(LoginVO vo) throws Exception;
    
    /**
	 * ??? ???
	 * @param vo LoginVO
	 * @return LoginVO
	 * @exception Exception
	 **/
    LoginVO searchId(LoginVO vo) throws Exception;
    
    /**
	 * ????????
	 * @param vo LoginVO
	 * @return boolean
	 * @exception Exception
	 **/
    boolean searchPassword(LoginVO vo) throws Exception;
    
    
    /**
	 * ????? ???.
	 * @param vo LoginVO
	 * @param Map mapLockUserInfo
	 * @return String
	 * @exception Exception
	 **/
    String processLoginIncorrect(LoginVO vo, Map<?,?> mapLockUserInfo) throws Exception;
    
    /**
	 * ????? ???.
	 * @param vo LoginVO
	 * @return Map
	 * @exception Exception
	 **/
    Map<?,?> selectLoginIncorrect(LoginVO vo) throws Exception;

    /**
	 * ????????? ??????????.
	 * @param vo LoginVO
	 * @return int
	 * @exception Exception
	 **/    
    int selectPassedDayChangePWD(LoginVO vo) throws Exception;

	/**
	 * ????? ? ??? ???.
	 * @param id
	 * @return LoginVO
	 * @exception Exception
	 **/
    LoginVO onepassLogin(String id) throws Exception;
}
