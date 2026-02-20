package egovframework.com.sym.bat.service;

import egovframework.com.cmm.ComDefaultVO;

/**
 * ???? ????model ?????
 *
 * @author ?
 * @since 2010.06.17
 * @version 1.0
 * @updated 17-6-2010 ?? 10:27:13
 * @see
 * 
 *      <pre>
 * == ?????Modification Information) ==
 *
 *   ????      ????          ????
 *  -------     --------    ---------------------------
 *  2010.06.17   ?    ????
 *      </pre>
 **/
public class BatchOpert extends ComDefaultVO {

    private static final long serialVersionUID = -8854151716958649397L;
    /**
     * ??ID
     **/
    private String batchOpertId;
    /**
     * ???
     **/
    private String batchOpertNm;
    /**
     * ????
     **/
    private String batchProgrm;
    /**
     * ???????
     **/
    private String lastUpdusrId;
    /**
     * ????
     **/
    private String lastUpdusrPnttm;
    /**
     * ????
     **/
    private String paramtr;
    /**
     * ??????
     **/
    private String useAt;
    /**
     * ???????
     **/
    private String frstRegisterId;
    /**
     * ????
     **/
    private String frstRegisterPnttm;

    /**
     * ??ID?????.
     * 
     * @return the batchOpertId
     **/
    public String getBatchOpertId() {
        return batchOpertId;
    }

    /**
     * ??ID??????.
     * 
     * @param batchOpertId ??????ID
     **/
    public void setBatchOpertId(String batchOpertId) {
        this.batchOpertId = batchOpertId;
    }

    /**
     * ???????.
     * 
     * @return the batchOpertNm
     **/
    public String getBatchOpertNm() {
        return batchOpertNm;
    }

    /**
     * ????????.
     * 
     * @param batchOpertNm ???????
     **/
    public void setBatchOpertNm(String batchOpertNm) {
        this.batchOpertNm = batchOpertNm;
    }

    /**
     * ????????.
     * 
     * @return the batchProgrm
     **/
    public String getBatchProgrm() {
        return batchProgrm;
    }

    /**
     * ?????????.
     * 
     * @param batchProgrm ????????
     **/
    public void setBatchProgrm(String batchProgrm) {
        this.batchProgrm = batchProgrm;
    }

    /**
     * ????????.
     * 
     * @return the lastUpdusrId
     **/
    public String getLastUpdusrId() {
        return lastUpdusrId;
    }

    /**
     * ?????????.
     * 
     * @param lastUpdusrId ???????
     **/
    public void setLastUpdusrId(String lastUpdusrId) {
        this.lastUpdusrId = lastUpdusrId;
    }

    /**
     * ?????????.
     * 
     * @return the lastUpdusrPnttm
     **/
    public String getLastUpdusrPnttm() {
        return lastUpdusrPnttm;
    }

    /**
     * ??????????.
     * 
     * @param lastUpdusrPnttm ????????
     **/
    public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
        this.lastUpdusrPnttm = lastUpdusrPnttm;
    }

    /**
     * ???????.
     * 
     * @return the paramtr
     **/
    public String getParamtr() {
        return paramtr;
    }

    /**
     * ????????.
     * 
     * @param paramtr ????????
     **/
    public void setParamtr(String paramtr) {
        this.paramtr = paramtr;
    }

    /**
     * ???????????.
     * 
     * @return the useAt
     **/
    public String getUseAt() {
        return useAt;
    }

    /**
     * ????????????.
     * 
     * @param useAt ??????????
     **/
    public void setUseAt(String useAt) {
        this.useAt = useAt;
    }

    /**
     * @return the frstRegisterId
     **/
    public String getFrstRegisterId() {
        return frstRegisterId;
    }

    /**
     * @return the frstRegisterPnttm
     **/
    public String getFrstRegisterPnttm() {
        return frstRegisterPnttm;
    }

    /**
     * @param frstRegisterId the frstRegisterId to set
     **/
    public void setFrstRegisterId(String frstRegisterId) {
        this.frstRegisterId = frstRegisterId;
    }

    /**
     * @param frstRegisterPnttm the frstRegisterPnttm to set
     **/
    public void setFrstRegisterPnttm(String frstRegisterPnttm) {
        this.frstRegisterPnttm = frstRegisterPnttm;
    }

}
