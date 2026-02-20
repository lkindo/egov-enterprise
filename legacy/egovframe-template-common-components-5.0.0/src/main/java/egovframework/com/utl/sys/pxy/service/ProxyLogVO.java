package egovframework.com.utl.sys.pxy.service;

/**
 * 媛쒖슂 - ?꾨줉?쒕줈洹몄젙蹂댁뿉 ???Vo ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜 - ?꾨줉?쒕줈洹몄젙蹂댁쓽 紐⑸줉 ??ぉ, 議고쉶議곌굔, ??젣???紐⑸줉 ?깆쓣 愿由ы븳??
 *
 * @author lee.m.j
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 10:44:50
 */
public class ProxyLogVO extends ProxyLog {
	private static final long serialVersionUID = 1L;

    /**
     * ?꾨줉?쒖꽌鍮꾩뒪?묒냽 ?쒖옉?쇱옄 議고쉶議곌굔
     */
    public String strStartDate;

    /**
     * ?꾨줉?쒖꽌鍮꾩뒪?묒냽 醫낅즺?쇱옄 議고쉶議곌굔
     */
    public String strEndDate;

    /**
     * @return the strStartDate
     */
    public String getStrStartDate() {
        return strStartDate;
    }

    /**
     * @param strStartDate the strStartDate to set
     */
    public void setStrStartDate(String strStartDate) {
        this.strStartDate = strStartDate;
    }

    /**
     * @return the strEndDate
     */
    public String getStrEndDate() {
        return strEndDate;
    }

    /**
     * @param strEndDate the strEndDate to set
     */
    public void setStrEndDate(String strEndDate) {
        this.strEndDate = strEndDate;
    }
}