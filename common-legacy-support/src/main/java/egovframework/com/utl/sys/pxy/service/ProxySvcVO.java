package egovframework.com.utl.sys.pxy.service;

/**
 * ??
 * - ?????????????Vo ?????? ???.
 *
 * ???
 * - ?????????????? ?? ? ????
 * @author lee.m.j
 * @version 1.0
 * @created 28-6-2010 ?? 10:44:51
 **/
public class ProxySvcVO extends ProxySvc {

	private static final long serialVersionUID = 1L;
    /**
     * ??????
     **/
    private String strProxyNm;

    /**
     * ?? ?????
     **/
    private String strPreSvcSttus;

    /**
     * @return the strProxyNm
     **/
    public String getStrProxyNm() {
        return strProxyNm;
    }

    /**
     * @param strProxyNm the strProxyNm to set
     **/
    public void setStrProxyNm(String strProxyNm) {
        this.strProxyNm = strProxyNm;
    }

    /**
     * @return the strPreSvcSttus
     **/
    public String getStrPreSvcSttus() {
        return strPreSvcSttus;
    }

    /**
     * @param strPreSvcSttus the strPreSvcSttus to set
     **/
    public void setStrPreSvcSttus(String strPreSvcSttus) {
        this.strPreSvcSttus = strPreSvcSttus;
    }

}
