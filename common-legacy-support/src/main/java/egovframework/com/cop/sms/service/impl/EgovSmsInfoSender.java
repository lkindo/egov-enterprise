package egovframework.com.cop.sms.service.impl;

import egovframework.com.cop.sms.service.SmsConnection;

/**
 * ?? ???? ?????(SME ?)
 * 
 * @author ?????? ????
 * @since 2009.06.18
 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.06.18  ????         ????
 *
 *      </pre>
 **/
public class EgovSmsInfoSender {
    // private String smeConfigPath = null;

    /**
     * SMS ???? SME ?? ??? ????
     * 
     * @param smeConfigPath
     **/
    public EgovSmsInfoSender(String smeConfigPath) {
        // this.smeConfigPath = smeConfigPath;
    }

    /**
     * ???????.
     * 
     * @throws Exception
     **/
    public void open() throws Exception {
        // ? ? (SME ?)
    }

    /**
     * ??????.
     **/
    public void close() {
        // ? ? (SME ?)
    }

    /**
     * ???????.
     * 
     * @param smsConn
     * @return
     * @throws Exception
     **/
    public SmsConnection send(SmsConnection smsConn) throws Exception {
        // ? ? (SME ?)

        // ? ??? ??(????: 0)
        smsConn.setResult(0);
        smsConn.setResultMessage("?         ");

        return smsConn;
    }
}
