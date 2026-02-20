package egovframework.com.cop.smt.sim.service;



import java.io.Serializable;



/**

 * ?????VO Class ?

 * 

 * @author ?????????

 * @since 2009.04.10

 * @version 1.0

 * @see

 *

 *      <pre>

 * << ?????Modification Information) >>

 *

 *   ????     ????          ????

 *  -------    --------    ---------------------------

 *   2009.04.10  ???         ????

 *

 *      </pre>

 **/

public class IndvdlSchdulManageVO implements Serializable {



	private static final long serialVersionUID = 6643386546296100019L;



	/** ??ID **/

	private String schdulId;



	/** ???(??? ?     ???   ???         ??         ?) */

	private String schdulSe;



	/** ????? **/

	private String schdulDeptId;



	/** ????????????) **/

	private String schdulKindCode;



	/** ?????? **/

	private String schdulBgnde;



	/** ????? **/

	private String schdulEndde;



	/** ???**/

	private String schdulNm;



	/** ???? **/

	private String schdulCn;



	/** ?????**/

	private String schdulPlace;



	/** ??????**/

	private String schdulIpcrCode;



	/** ?????? **/

	private String schdulChargerId;



	/** ????ID **/

	private String atchFileId;



	/** ?????? ?, ??? **/

	private String reptitSeCode;



	/** ???? **/

	private String frstRegisterPnttm = "";



	/** ??? **/

	private String frstRegisterId = "";



	/** ???? **/

	private String lastUpdusrPnttm = "";



	/** ??ID **/

	private String lastUpdusrId = "";



	/** ??????(??) **/

	private String schdulBgndeHH = "";



	/** ??????(?? **/

	private String schdulBgndeMM = "";



	/** ?????(??) **/

	private String schdulEnddeHH = "";



	/** ?????(?? **/

	private String schdulEnddeMM = "";



	/** ??????(Year Month/Day) */

	private String schdulBgndeYYYMMDD = "";



	/** ?????(Year Month/Day) */

	private String schdulEnddeYYYMMDD = "";



	/** ???????**/

	private String schdulDeptName = "";



	/** ????? **/

	private String schdulChargerName = "";



	/** ???**/

	private String searchCnd = "";



	/** ????**/

	private String searchWrd = "";



	/** ??? **/

	private int pageIndex = 1;



	/** ????**/

	private int pageUnit = 10;



	/** ??????**/

	private int pageSize = 10;



	/** ???? ???**/

	private int firstIndex = 1;



	/** ????? ???**/

	private int lastIndex = 1;



	/** ??????????**/

	private int recordCountPerPage = 10;



	/** ??????**/

	private int rowNo = 0;



	public String getSearchCnd() {

		return searchCnd;

	}



	public void setSearchCnd(String searchCnd) {

		this.searchCnd = searchCnd;

	}



	public String getSearchWrd() {

		return searchWrd;

	}



	public void setSearchWrd(String searchWrd) {

		this.searchWrd = searchWrd;

	}



	public int getPageIndex() {

		return pageIndex;

	}



	public void setPageIndex(int pageIndex) {

		this.pageIndex = pageIndex;

	}



	public int getPageUnit() {

		return pageUnit;

	}



	public void setPageUnit(int pageUnit) {

		this.pageUnit = pageUnit;

	}



	public int getPageSize() {

		return pageSize;

	}



	public void setPageSize(int pageSize) {

		this.pageSize = pageSize;

	}



	public int getFirstIndex() {

		return firstIndex;

	}



	public void setFirstIndex(int firstIndex) {

		this.firstIndex = firstIndex;

	}



	public int getLastIndex() {

		return lastIndex;

	}



	public void setLastIndex(int lastIndex) {

		this.lastIndex = lastIndex;

	}



	public int getRecordCountPerPage() {

		return recordCountPerPage;

	}



	public void setRecordCountPerPage(int recordCountPerPage) {

		this.recordCountPerPage = recordCountPerPage;

	}



	public int getRowNo() {

		return rowNo;

	}



	public void setRowNo(int rowNo) {

		this.rowNo = rowNo;

	}



	/**

	 * schdulId attribute ?????.

	 * 

	 * @return the String

	 **/

	public String getSchdulId() {

		return schdulId;

	}



	/**

	 * schdulId attribute ???????.

	 * 

	 * @return schdulId String

	 **/

	public void setSchdulId(String schdulId) {

		this.schdulId = schdulId;

	}



	/**

	 * schdulSe attribute ?????.

	 * 

	 * @return the String

	 **/

	public String getSchdulSe() {

		return schdulSe;

	}



	/**

	 * schdulSe attribute ???????.

	 * 

	 * @return schdulSe String

	 **/

	public void setSchdulSe(String schdulSe) {

		this.schdulSe = schdulSe;

	}



	/**

	 * schdulDeptId attribute ?????.

	 * 

	 * @return the String

	 **/

	public String getSchdulDeptId() {

		return schdulDeptId;

	}



	/**

	 * schdulDeptId attribute ???????.

	 * 

	 * @return schdulDeptId String

	 **/

	public void setSchdulDeptId(String schdulDeptId) {

		this.schdulDeptId = schdulDeptId;

	}



	/**

	 * schdulKindCode attribute ?????.

	 * 

	 * @return the String

	 **/

	public String getSchdulKindCode() {

		return schdulKindCode;

	}



	/**

	 * schdulKindCode attribute ???????.

	 * 

	 * @return schdulKindCode String

	 **/

	public void setSchdulKindCode(String schdulKindCode) {

		this.schdulKindCode = schdulKindCode;

	}



	/**

	 * schdulBgnde attribute ?????.

	 * 

	 * @return the String

	 **/

	public String getSchdulBgnde() {

		return schdulBgnde;

	}



	/**

	 * schdulBgnde attribute ???????.

	 * 

	 * @return schdulBgnde String

	 **/

	public void setSchdulBgnde(String schdulBgnde) {

		this.schdulBgnde = schdulBgnde;

	}



	/**

	 * schdulEndde attribute ?????.

	 * 

	 * @return the String

	 **/

	public String getSchdulEndde() {

		return schdulEndde;

	}



	/**

	 * schdulEndde attribute ???????.

	 * 

	 * @return schdulEndde String

	 **/

	public void setSchdulEndde(String schdulEndde) {

		this.schdulEndde = schdulEndde;

	}



	/**

	 * schdulNm attribute ?????.

	 * 

	 * @return the String

	 **/

	public String getSchdulNm() {

		return schdulNm;

	}



	/**

	 * schdulNm attribute ???????.

	 * 

	 * @return schdulNm String

	 **/

	public void setSchdulNm(String schdulNm) {

		this.schdulNm = schdulNm;

	}



	/**

	 * schdulCn attribute ?????.

	 * 

	 * @return the String

	 **/

	public String getSchdulCn() {

		return schdulCn;

	}



	/**

	 * schdulCn attribute ???????.

	 * 

	 * @return schdulCn String

	 **/

	public void setSchdulCn(String schdulCn) {

		this.schdulCn = schdulCn;

	}



	/**

	 * schdulPlace attribute ?????.

	 * 

	 * @return the String

	 **/

	public String getSchdulPlace() {

		return schdulPlace;

	}



	/**

	 * schdulPlace attribute ???????.

	 * 

	 * @return schdulPlace String

	 **/

	public void setSchdulPlace(String schdulPlace) {

		this.schdulPlace = schdulPlace;

	}



	/**

	 * schdulIpcrCode attribute ?????.

	 * 

	 * @return the String

	 **/

	public String getSchdulIpcrCode() {

		return schdulIpcrCode;

	}



	/**

	 * schdulIpcrCode attribute ???????.

	 * 

	 * @return schdulIpcrCode String

	 **/

	public void setSchdulIpcrCode(String schdulIpcrCode) {

		this.schdulIpcrCode = schdulIpcrCode;

	}



	/**

	 * schdulChargerId attribute ?????.

	 * 

	 * @return the String

	 **/

	public String getSchdulChargerId() {

		return schdulChargerId;

	}



	/**

	 * schdulChargerId attribute ???????.

	 * 

	 * @return schdulChargerId String

	 **/

	public void setSchdulChargerId(String schdulChargerId) {

		this.schdulChargerId = schdulChargerId;

	}



	/**

	 * atchFileId attribute ?????.

	 * 

	 * @return the String

	 **/

	public String getAtchFileId() {

		return atchFileId;

	}



	/**

	 * atchFileId attribute ???????.

	 * 

	 * @return atchFileId String

	 **/

	public void setAtchFileId(String atchFileId) {

		this.atchFileId = atchFileId;

	}



	/**

	 * reptitSeCode attribute ?????.

	 * 

	 * @return the String

	 **/

	public String getReptitSeCode() {

		return reptitSeCode;

	}



	/**

	 * reptitSeCode attribute ???????.

	 * 

	 * @return reptitSeCode String

	 **/

	public void setReptitSeCode(String reptitSeCode) {

		this.reptitSeCode = reptitSeCode;

	}



	/**

	 * frstRegisterPnttm attribute ?????.

	 * 

	 * @return the String

	 **/

	public String getFrstRegisterPnttm() {

		return frstRegisterPnttm;

	}



	/**

	 * frstRegisterPnttm attribute ???????.

	 * 

	 * @return frstRegisterPnttm String

	 **/

	public void setFrstRegisterPnttm(String frstRegisterPnttm) {

		this.frstRegisterPnttm = frstRegisterPnttm;

	}



	/**

	 * frstRegisterId attribute ?????.

	 * 

	 * @return the String

	 **/

	public String getFrstRegisterId() {

		return frstRegisterId;

	}



	/**

	 * frstRegisterId attribute ???????.

	 * 

	 * @return frstRegisterId String

	 **/

	public void setFrstRegisterId(String frstRegisterId) {

		this.frstRegisterId = frstRegisterId;

	}



	/**

	 * lastUpdusrPnttm attribute ?????.

	 * 

	 * @return the String

	 **/

	public String getLastUpdusrPnttm() {

		return lastUpdusrPnttm;

	}



	/**

	 * lastUpdusrPnttm attribute ???????.

	 * 

	 * @return lastUpdusrPnttm String

	 **/

	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {

		this.lastUpdusrPnttm = lastUpdusrPnttm;

	}



	/**

	 * lastUpdusrId attribute ?????.

	 * 

	 * @return the String

	 **/

	public String getLastUpdusrId() {

		return lastUpdusrId;

	}



	/**

	 * lastUpdusrId attribute ???????.

	 * 

	 * @return lastUpdusrId String

	 **/

	public void setLastUpdusrId(String lastUpdusrId) {

		this.lastUpdusrId = lastUpdusrId;

	}



	/**

	 * schdulBgndeHH attribute ?????.

	 * 

	 * @return the String

	 **/

	public String getSchdulBgndeHH() {

		return schdulBgndeHH;

	}



	/**

	 * schdulBgndeHH attribute ???????.

	 * 

	 * @return schdulBgndeHH String

	 **/

	public void setSchdulBgndeHH(String schdulBgndeHH) {

		this.schdulBgndeHH = schdulBgndeHH;

	}



	/**

	 * schdulBgndeMM attribute ?????.

	 * 

	 * @return the String

	 **/

	public String getSchdulBgndeMM() {

		return schdulBgndeMM;

	}



	/**

	 * schdulBgndeMM attribute ???????.

	 * 

	 * @return schdulBgndeMM String

	 **/

	public void setSchdulBgndeMM(String schdulBgndeMM) {

		this.schdulBgndeMM = schdulBgndeMM;

	}



	/**

	 * schdulEnddeHH attribute ?????.

	 * 

	 * @return the String

	 **/

	public String getSchdulEnddeHH() {

		return schdulEnddeHH;

	}



	/**

	 * schdulEnddeHH attribute ???????.

	 * 

	 * @return schdulEnddeHH String

	 **/

	public void setSchdulEnddeHH(String schdulEnddeHH) {

		this.schdulEnddeHH = schdulEnddeHH;

	}



	/**

	 * schdulEnddeMM attribute ?????.

	 * 

	 * @return the String

	 **/

	public String getSchdulEnddeMM() {

		return schdulEnddeMM;

	}



	/**

	 * schdulEnddeMM attribute ???????.

	 * 

	 * @return schdulEnddeMM String

	 **/

	public void setSchdulEnddeMM(String schdulEnddeMM) {

		this.schdulEnddeMM = schdulEnddeMM;

	}



	/**

	 * schdulBgndeYYYMMDD attribute ?????.

	 * 

	 * @return the String

	 **/

	public String getSchdulBgndeYYYMMDD() {

		return schdulBgndeYYYMMDD;

	}



	/**

	 * schdulBgndeYYYMMDD attribute ???????.

	 * 

	 * @return schdulBgndeYYYMMDD String

	 **/

	public void setSchdulBgndeYYYMMDD(String schdulBgndeYYYMMDD) {

		this.schdulBgndeYYYMMDD = schdulBgndeYYYMMDD;

	}



	/**

	 * schdulEnddeYYYMMDD attribute ?????.

	 * 

	 * @return the String

	 **/

	public String getSchdulEnddeYYYMMDD() {

		return schdulEnddeYYYMMDD;

	}



	/**

	 * schdulEnddeYYYMMDD attribute ???????.

	 * 

	 * @return schdulEnddeYYYMMDD String

	 **/

	public void setSchdulEnddeYYYMMDD(String schdulEnddeYYYMMDD) {

		this.schdulEnddeYYYMMDD = schdulEnddeYYYMMDD;

	}



	/**

	 * schdulDeptName attribute ?????.

	 * 

	 * @return the String

	 **/

	public String getSchdulDeptName() {

		return schdulDeptName;

	}



	/**

	 * schdulDeptName attribute ???????.

	 * 

	 * @return schdulDeptName String

	 **/

	public void setSchdulDeptName(String schdulDeptName) {

		this.schdulDeptName = schdulDeptName;

	}



	/**

	 * schdulChargerName attribute ?????.

	 * 

	 * @return the String

	 **/

	public String getSchdulChargerName() {

		return schdulChargerName;

	}



	/**

	 * schdulChargerName attribute ???????.

	 * 

	 * @return schdulChargerName String

	 **/

	public void setSchdulChargerName(String schdulChargerName) {

		this.schdulChargerName = schdulChargerName;

	}



}

