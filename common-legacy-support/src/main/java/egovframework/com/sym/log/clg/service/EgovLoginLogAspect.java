package egovframework.com.sym.log.clg.service;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import jakarta.annotation.Resource;

/**
 * ??????????? ASPECT ?????
 *
 * @author ????????? ????
 * @version 1.0
 * @see <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.03.11  ????         ????
 *   2011.07.01  ????         ??? ???sym.log -> sym.log.clg)
 *   2025.07.09  ????         2025????????PMD???????? ????????-UnnecessaryBoxing(???WrapperObject ??)
 *
 *      </pre>
 * @since 2009.03.11
 **/
public class EgovLoginLogAspect {
    //?????? - ???
    public static final String LOGIN_METHOD_LOGIN = "I";
    //?????? - ??
    public static final String LOGIN_METHOD_LOGOUT = "O";
    //???? ???
    public static final String EMPTY_STRING = "";
    //?? ???? - ??(No)
    public static final String ERROR_OCCURRED_NO = "N";

    @Resource(name = "EgovLoginLogService")
    private EgovLoginLogService loginLogService;

    /**
     * ???????????. EgovLoginController.actionMain Method
     *
     * @param
     * @return void
     * @throws Exception
     **/
    public void logLogin() throws Throwable {

        String uniqId = null;
        String ip = null;

        /* Authenticated  */
        LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        if (loginVO != null) {
            uniqId = loginVO.getUniqId();
            ip = loginVO.getIp();
        }

        LoginLog loginLog = new LoginLog();
        loginLog.setLoginId(uniqId);
        loginLog.setLoginIp(ip);
        loginLog.setLoginMthd(LOGIN_METHOD_LOGIN); // ???I, ??:O
        loginLog.setErrOccrrAt(ERROR_OCCURRED_NO);
        loginLog.setErrorCode(EMPTY_STRING);
        loginLogService.logInsertLoginLog(loginLog);

    }

    /**
     * ?? ????????. EgovLoginController.actionLogout Method
     *
     * @param
     * @return void
     * @throws Exception
     **/
    public void logLogout() throws Throwable {

        String uniqId = null;
        String ip = null;

        /* Authenticated  */
        LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        if (loginVO != null) {
            uniqId = loginVO.getUniqId();
            ip = loginVO.getIp();
        }

        LoginLog loginLog = new LoginLog();
        loginLog.setLoginId(uniqId);
        loginLog.setLoginIp(ip);
        loginLog.setLoginMthd(LOGIN_METHOD_LOGOUT); // ???I, ??:O
        loginLog.setErrOccrrAt(ERROR_OCCURRED_NO);
        loginLog.setErrorCode(EMPTY_STRING);
        loginLogService.logInsertLoginLog(loginLog);
    }

}
