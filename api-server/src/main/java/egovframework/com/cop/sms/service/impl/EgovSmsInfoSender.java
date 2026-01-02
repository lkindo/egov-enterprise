package egovframework.com.cop.sms.service.impl;

import egovframework.com.cop.sms.service.SmsConnection;

/**
 * 문자메시지 전송을 위한 클래스 (SME 연동)
 * 
 * @author 공통컴포넌트개발팀 한성곤
 * @since 2009.06.18
 * @version 1.0
 * @see
 *
 *      <pre>
 * << 개정이력(Modification Information) >>
 *
 *   수정일      수정자           수정내용
 *  -------    --------    ---------------------------
 *   2009.06.18  한성곤          최초 생성
 *
 *      </pre>
 */
public class EgovSmsInfoSender {
    // private String smeConfigPath = null;

    /**
     * SMS 전송을 위한 SME 설정 파일 경로를 지정한다.
     * 
     * @param smeConfigPath
     */
    public EgovSmsInfoSender(String smeConfigPath) {
        // this.smeConfigPath = smeConfigPath;
    }

    /**
     * 연결을 오픈한다.
     * 
     * @throws Exception
     */
    public void open() throws Exception {
        // 구현 필요 (SME 연동)
    }

    /**
     * 연결을 종료한다.
     */
    public void close() {
        // 구현 필요 (SME 연동)
    }

    /**
     * 메시지를 전송한다.
     * 
     * @param smsConn
     * @return
     * @throws Exception
     */
    public SmsConnection send(SmsConnection smsConn) throws Exception {
        // 구현 필요 (SME 연동)

        // 전송 성공으로 가정 (결과 코드 : 0)
        smsConn.setResult(0);
        smsConn.setResultMessage("성공");

        return smsConn;
    }
}
