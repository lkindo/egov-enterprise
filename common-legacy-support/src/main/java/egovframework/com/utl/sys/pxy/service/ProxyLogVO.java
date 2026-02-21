package egovframework.com.utl.sys.pxy.service;

/**
 * ??- ????? ????Vo ?????? ???.
 *
 * ??? - ????? ????? ??, ????????? ????
 *
 * @author lee.m.j
 * @version 1.0
 * @created 28-6-2010 ?? 10:44:50
 **/
public class ProxyLogVO extends ProxyLog {
	private static final long serialVersionUID = 1L;

    /**
     * ??????? ???? ??
     **/
    public String strStartDate;

    /**
     * ??????? ??? ??
     **/
    public String strEndDate;

    /**
     * @return the strStartDate
     **/
    public String getStrStartDate() {
        return strStartDate;
    }

    /**
     * @param strStartDate the strStartDate to set
     **/
    public void setStrStartDate(String strStartDate) {
        this.strStartDate = strStartDate;
    }

    /**
     * @return the strEndDate
     **/
    public String getStrEndDate() {
        return strEndDate;
    }

    /**
     * @param strEndDate the strEndDate to set
     **/
    public void setStrEndDate(String strEndDate) {
        this.strEndDate = strEndDate;
    }
}
