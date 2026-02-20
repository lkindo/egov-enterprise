package egovframework.com.cop.smt.lsm.service;



import java.io.Serializable;



/**

 * ??

 * - ?????????model ?????? ???.

 * 

 * ???

 * - ??ID, ???, ??? ????, ????? ?ID, ???, ??????, ?????, ?????? ?????

 * ????

 * 

 * @author ???

 * @version 1.0

 * @created 28-6-2010 ?? 10:59:06

 * 

 *          <pre>

 * << ?????Modification Information) >>

 *   

 *   ????     ????          ????

 *  -------    --------    ---------------------------

 *   2010.6.28	???         ????

 *

 *          </pre>

 **/

public class LeaderSchdul implements Serializable {



	private static final long serialVersionUID = 1L;



	/** ??ID **/

	private String schdulId;

	/** ??? **/

	private String schdulSe;

	/** ???**/

	private String schdulNm;

	/** ???? **/

	private String schdulCn;

	/** ?????**/

	private String schdulPlace;

	/** ?ID **/

	private String leaderId;

	/** ??**/

	private String leaderName;

	/** ??? **/

	private String reptitSeCode;

	/** ???? **/

	private String schdulDe;

	/** ?????? **/

	private String schdulBgnDe;

	/** ????? **/

	private String schdulEndDe;

	/** ?????? **/

	private String schdulChargerId;

	/** ??????? **/

	private String schdulChargerName;

	/** ??? **/

	private String frstRegisterId = "";

	/** ???? **/

	private String frstRegisterPnttm = "";

	/** ??? **/

	private String lastUpdusrId = "";

	/** ???? **/

	private String lastUpdusrPnttm = "";

	/** ??????**/

	private String schdulIpcrCode;



	public String getSchdulIpcrCode() {

		return schdulIpcrCode;

	}



	public void setSchdulIpcrCode(String schdulIpcrCode) {

		this.schdulIpcrCode = schdulIpcrCode;

	}



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



	public String getSchdulId() {

		return schdulId;

	}



	public void setSchdulId(String schdulId) {

		this.schdulId = schdulId;

	}



	public String getSchdulSe() {

		return schdulSe;

	}



	public void setSchdulSe(String schdulSe) {

		this.schdulSe = schdulSe;

	}



	public String getSchdulNm() {

		return schdulNm;

	}



	public void setSchdulNm(String schdulNm) {

		this.schdulNm = schdulNm;

	}



	public String getSchdulCn() {

		return schdulCn;

	}



	public void setSchdulCn(String schdulCn) {

		this.schdulCn = schdulCn;

	}



	public String getSchdulPlace() {

		return schdulPlace;

	}



	public void setSchdulPlace(String schdulPlace) {

		this.schdulPlace = schdulPlace;

	}



	public String getLeaderId() {

		return leaderId;

	}



	public void setLeaderId(String leaderId) {

		this.leaderId = leaderId;

	}



	public String getLeaderName() {

		return leaderName;

	}



	public void setLeaderName(String leaderName) {

		this.leaderName = leaderName;

	}



	public String getReptitSeCode() {

		return reptitSeCode;

	}



	public void setReptitSeCode(String reptitSeCode) {

		this.reptitSeCode = reptitSeCode;

	}



	public String getSchdulDe() {

		return schdulDe;

	}



	public void setSchdulDe(String schdulDe) {

		this.schdulDe = schdulDe;

	}



	public String getSchdulBgnDe() {

		return schdulBgnDe;

	}



	public void setSchdulBgnDe(String schdulBgnDe) {

		this.schdulBgnDe = schdulBgnDe;

	}



	public String getSchdulEndDe() {

		return schdulEndDe;

	}



	public void setSchdulEndDe(String schdulEndDe) {

		this.schdulEndDe = schdulEndDe;

	}



	public String getSchdulChargerId() {

		return schdulChargerId;

	}



	public void setSchdulChargerId(String schdulChargerId) {

		this.schdulChargerId = schdulChargerId;

	}



	public String getSchdulChargerName() {

		return schdulChargerName;

	}



	public void setSchdulChargerName(String schdulChargerName) {

		this.schdulChargerName = schdulChargerName;

	}



	public String getFrstRegisterId() {

		return frstRegisterId;

	}



	public void setFrstRegisterId(String frstRegisterId) {

		this.frstRegisterId = frstRegisterId;

	}



	public String getFrstRegisterPnttm() {

		return frstRegisterPnttm;

	}



	public void setFrstRegisterPnttm(String frstRegisterPnttm) {

		this.frstRegisterPnttm = frstRegisterPnttm;

	}



	public String getLastUpdusrId() {

		return lastUpdusrId;

	}



	public void setLastUpdusrId(String lastUpdusrId) {

		this.lastUpdusrId = lastUpdusrId;

	}



	public String getLastUpdusrPnttm() {

		return lastUpdusrPnttm;

	}



	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {

		this.lastUpdusrPnttm = lastUpdusrPnttm;

	}



	public String getSchdulBgndeHH() {

		return schdulBgndeHH;

	}



	public void setSchdulBgndeHH(String schdulBgndeHH) {

		this.schdulBgndeHH = schdulBgndeHH;

	}



	public String getSchdulBgndeMM() {

		return schdulBgndeMM;

	}



	public void setSchdulBgndeMM(String schdulBgndeMM) {

		this.schdulBgndeMM = schdulBgndeMM;

	}



	public String getSchdulEnddeHH() {

		return schdulEnddeHH;

	}



	public void setSchdulEnddeHH(String schdulEnddeHH) {

		this.schdulEnddeHH = schdulEnddeHH;

	}



	public String getSchdulEnddeMM() {

		return schdulEnddeMM;

	}



	public void setSchdulEnddeMM(String schdulEnddeMM) {

		this.schdulEnddeMM = schdulEnddeMM;

	}



	public String getSchdulBgndeYYYMMDD() {

		return schdulBgndeYYYMMDD;

	}



	public void setSchdulBgndeYYYMMDD(String schdulBgndeYYYMMDD) {

		this.schdulBgndeYYYMMDD = schdulBgndeYYYMMDD;

	}



	public String getSchdulEnddeYYYMMDD() {

		return schdulEnddeYYYMMDD;

	}



	public void setSchdulEnddeYYYMMDD(String schdulEnddeYYYMMDD) {

		this.schdulEnddeYYYMMDD = schdulEnddeYYYMMDD;

	}



}

