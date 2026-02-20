package egovframework.com.uss.sam.stp.service;

/**
 * 
 * ?????????? VO ?????
 * @author ???????? ??
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *   
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.04.01  ??         ????
 *   2016.06.13  ???         ???????v3.6 ?
 *
 * </pre>
 **/
public class StplatManageVO extends StplatManageDefaultVO {
	
    private static final long serialVersionUID = 1L;
    
    /** ????? ID **/
    private String useStplatId;
    
	/** ??????**/
    private String useStplatNm;    
    
    /** ??????? **/
    private String useStplatCn;
    
    /** ??????? **/
    private String infoProvdAgreCn;
    
    /** ???? **/
    private String frstRegistPnttm;
        
    /** ???? **/
    private String frstRegisterNm;
    
    /** ???? **/
    private String frstRegisterPnttm;
    
    /** ??? **/
    private String frstRegisterId;

    /** ???? **/
    private String lastUpdusrPnttm;
    
    /** ???? **/
    private String lastUpdtPnttm;

    /** ??? **/
    private String lastUpdusrId;

	public String getUseStplatId() {
		return useStplatId;
	}

	public void setUseStplatId(String useStplatId) {
		this.useStplatId = useStplatId;
	}

	public String getUseStplatNm() {
		return useStplatNm;
	}

	public void setUseStplatNm(String useStplatNm) {
		this.useStplatNm = useStplatNm;
	}

	public String getUseStplatCn() {
		return useStplatCn;
	}

	public void setUseStplatCn(String useStplatCn) {
		this.useStplatCn = useStplatCn;
	}

	public String getInfoProvdAgreCn() {
		return infoProvdAgreCn;
	}

	public void setInfoProvdAgreCn(String infoProvdAgreCn) {
		this.infoProvdAgreCn = infoProvdAgreCn;
	}

	public String getFrstRegistPnttm() {
		return frstRegistPnttm;
	}

	public void setFrstRegistPnttm(String frstRegistPnttm) {
		this.frstRegistPnttm = frstRegistPnttm;
	}

	public String getFrstRegisterNm() {
		return frstRegisterNm;
	}

	public void setFrstRegisterNm(String frstRegisterNm) {
		this.frstRegisterNm = frstRegisterNm;
	}

	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}

	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}

	public String getFrstRegisterId() {
		return frstRegisterId;
	}

	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}

	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}

	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}

	public String getLastUpdtPnttm() {
		return lastUpdtPnttm;
	}

	public void setLastUpdtPnttm(String lastUpdtPnttm) {
		this.lastUpdtPnttm = lastUpdtPnttm;
	}

	public String getLastUpdusrId() {
		return lastUpdusrId;
	}

	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}

}
