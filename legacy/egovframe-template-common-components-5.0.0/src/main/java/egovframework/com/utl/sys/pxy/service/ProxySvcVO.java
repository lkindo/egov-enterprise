package egovframework.com.utl.sys.pxy.service;

/**
 * 媛쒖슂
 * - ?꾨줉?쒖꽌鍮꾩뒪?뺣낫?????Vo ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?꾨줉?쒖꽌鍮꾩뒪?뺣낫??紐⑸줉 ??ぉ, 議고쉶議곌굔 ?깆쓣 愿由ы븳??
 * @author lee.m.j
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 10:44:51
 */
public class ProxySvcVO extends ProxySvc {

	private static final long serialVersionUID = 1L;
    /**
     * ?꾨줉??紐?議고쉶議곌굔
     */
    private String strProxyNm;

    /**
     * ?댁쟾 ?쒕퉬???곹깭
     */
    private String strPreSvcSttus;

    /**
     * @return the strProxyNm
     */
    public String getStrProxyNm() {
        return strProxyNm;
    }

    /**
     * @param strProxyNm the strProxyNm to set
     */
    public void setStrProxyNm(String strProxyNm) {
        this.strProxyNm = strProxyNm;
    }

    /**
     * @return the strPreSvcSttus
     */
    public String getStrPreSvcSttus() {
        return strPreSvcSttus;
    }

    /**
     * @param strPreSvcSttus the strPreSvcSttus to set
     */
    public void setStrPreSvcSttus(String strPreSvcSttus) {
        this.strPreSvcSttus = strPreSvcSttus;
    }

}
