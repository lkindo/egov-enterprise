package egovframework.com.cop.ems.service;



import egovframework.com.cmm.ComDefaultVO;



/**

 * ? VO ?????

 * 

 * @author ???????? ???

 * @since 2009.03.12

 * @version 1.0

 * @see

 *

 *      <pre>

 * << ?????Modification Information) >>

 *

 *   ????     ????         ????

 *  -------    --------    ---------------------------

 *  2009.03.12  ???         ????

 *  2011.12.06  ????         ?????fileStreCours), ???????orignlFileNm) ??

 *

 *      </pre>

 **/

public class SndngMailVO extends ComDefaultVO {



	/** ??ID **/

	private String mssageId;

	/** ???**/

	private String dsptchPerson;

	/** ????**/

	private String recptnPerson;

	/** ?? **/

	private String sj;

	/** ???**/

	private String sndngResultCode;

	/** ??? **/

	private String emailCn;

	/** ????ID **/

	private String atchFileId;

	/** ?????**/

	private String fileStreCours;

	/** ???????**/

	private String orignlFileNm;

	/** ??? **/

	private String sndngDe;

	/** ????ID ???**/

	private String atchFileIdList;

	/** ??XML?? **/

	private String xmlContent;

	/** ?????(Y N) */

	private String link;



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

	 * mssageId attribute ?????.

	 * 

	 * @return String

	 **/

	public String getMssageId() {

		return mssageId;

	}



	/**

	 * mssageId attribute ???????.

	 * 

	 * @param mssageId String

	 **/

	public void setMssageId(String mssageId) {

		this.mssageId = mssageId;

	}



	/**

	 * dsptchPerson attribute ?????.

	 * 

	 * @return String

	 **/

	public String getDsptchPerson() {

		return dsptchPerson;

	}



	/**

	 * dsptchPerson attribute ???????.

	 * 

	 * @param dsptchPerson String

	 **/

	public void setDsptchPerson(String dsptchPerson) {

		this.dsptchPerson = dsptchPerson;

	}



	/**

	 * recptnPerson attribute ?????.

	 * 

	 * @return String

	 **/

	public String getRecptnPerson() {

		return recptnPerson;

	}



	/**

	 * recptnPerson attribute ???????.

	 * 

	 * @param recptnPerson String

	 **/

	public void setRecptnPerson(String recptnPerson) {

		this.recptnPerson = recptnPerson;

	}



	/**

	 * sj attribute ?????.

	 * 

	 * @return String

	 **/

	public String getSj() {

		return sj;

	}



	/**

	 * sj attribute ???????.

	 * 

	 * @param sj String

	 **/

	public void setSj(String sj) {

		this.sj = sj;

	}



	/**

	 * sndngResultCode attribute ?????.

	 * 

	 * @return String

	 **/

	public String getSndngResultCode() {

		return sndngResultCode;

	}



	/**

	 * sndngResultCode attribute ???????.

	 * 

	 * @param sndngResultCode String

	 **/

	public void setSndngResultCode(String sndngResultCode) {

		this.sndngResultCode = sndngResultCode;

	}



	/**

	 * emailCn attribute ?????.

	 * 

	 * @return String

	 **/

	public String getEmailCn() {

		return emailCn;

	}



	/**

	 * emailCn attribute ???????.

	 * 

	 * @param emailCn String

	 **/

	public void setEmailCn(String emailCn) {

		this.emailCn = emailCn;

	}



	/**

	 * atchFileId attribute ?????.

	 * 

	 * @return String

	 **/

	public String getAtchFileId() {

		return atchFileId;

	}



	/**

	 * atchFileId attribute ???????.

	 * 

	 * @param atchFileId String

	 **/

	public void setAtchFileId(String atchFileId) {

		this.atchFileId = atchFileId;

	}



	public String getFileStreCours() {

		return fileStreCours;

	}



	public void setFileStreCours(String fileStreCours) {

		this.fileStreCours = fileStreCours;

	}



	public String getOrignlFileNm() {

		return orignlFileNm;

	}



	public void setOrignlFileNm(String orignlFileNm) {

		this.orignlFileNm = orignlFileNm;

	}



	/**

	 * sndngDe attribute ?????.

	 * 

	 * @return String

	 **/

	public String getSndngDe() {

		return sndngDe;

	}



	/**

	 * sndngDe attribute ???????.

	 * 

	 * @param sndngDe String

	 **/

	public void setSndngDe(String sndngDe) {

		this.sndngDe = sndngDe;

	}



	/**

	 * atchFileIdList attribute ?????.

	 * 

	 * @return String

	 **/

	public String getAtchFileIdList() {

		return atchFileIdList;

	}



	/**

	 * atchFileIdList attribute ???????.

	 * 

	 * @param atchFileIdList String

	 **/

	public void setAtchFileIdList(String atchFileIdList) {

		this.atchFileIdList = atchFileIdList;

	}



	/**

	 * xmlContent attribute ?????.

	 * 

	 * @return String

	 **/

	public String getXmlContent() {

		return xmlContent;

	}



	/**

	 * xmlContent attribute ???????.

	 * 

	 * @param xmlContent String

	 **/

	public void setXmlContent(String xmlContent) {

		this.xmlContent = xmlContent;

	}



	/**

	 * link attribute ?????.

	 * 

	 * @return String

	 **/

	public String getLink() {

		return link;

	}



	/**

	 * link attribute ???????.

	 * 

	 * @param link String

	 **/

	public void setLink(String link) {

		this.link = link;

	}

}

