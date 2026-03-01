package egovframework.com.sym.log.clg.service;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import jakarta.annotation.Resource;

/**
 * ?쒖뒪??濡쒓렇 ?앹꽦???꾪븳 ASPECT ?대옒??
 *
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? ?댁궪??
 * @version 1.0
 * @see <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.11  ?댁궪??         理쒖큹 ?앹꽦
 *   2011.07.01  ?닿린??         ?⑦궎吏 遺꾨━(sym.log -> sym.log.clg)
 *   2025.07.09  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-UnnecessaryBoxing(遺덊븘?뷀븳 WrapperObject ?앹꽦)
 *
 *      </pre>
 * @since 2009.03.11
 */
public class EgovLoginLogAspect {
    //濡쒓렇??濡쒓렇 ?좏삎 - 濡쒓렇??
    public static final String LOGIN_METHOD_LOGIN = "I";
    //濡쒓렇??濡쒓렇 ?좏삎 - 濡쒓렇?꾩썐
    public static final String LOGIN_METHOD_LOGOUT = "O";
    //鍮꾩뼱?덈뒗 臾몄옄
    public static final String EMPTY_STRING = "";
    //?먮윭 諛쒖깮 ?щ? - 誘몃컻??(No)
    public static final String ERROR_OCCURRED_NO = "N";

    @Resource(name = "EgovLoginLogService")
    private EgovLoginLogService loginLogService;

    /**
     * 濡쒓렇??濡쒓렇?뺣낫瑜??앹꽦?쒕떎. EgovLoginController.actionMain Method
     *
     * @param
     * @return void
     * @throws Exception
     */
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
        loginLog.setLoginMthd(LOGIN_METHOD_LOGIN); // 濡쒓렇??I, 濡쒓렇?꾩썐:O
        loginLog.setErrOccrrAt(ERROR_OCCURRED_NO);
        loginLog.setErrorCode(EMPTY_STRING);
        loginLogService.logInsertLoginLog(loginLog);

    }

    /**
     * 濡쒓렇?꾩썐 濡쒓렇?뺣낫瑜??앹꽦?쒕떎. EgovLoginController.actionLogout Method
     *
     * @param
     * @return void
     * @throws Exception
     */
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
        loginLog.setLoginMthd(LOGIN_METHOD_LOGOUT); // 濡쒓렇??I, 濡쒓렇?꾩썐:O
        loginLog.setErrOccrrAt(ERROR_OCCURRED_NO);
        loginLog.setErrorCode(EMPTY_STRING);
        loginLogService.logInsertLoginLog(loginLog);
    }

}
