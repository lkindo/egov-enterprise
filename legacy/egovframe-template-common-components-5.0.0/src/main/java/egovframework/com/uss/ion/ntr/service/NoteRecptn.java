package egovframework.com.uss.ion.ntr.service;

import java.util.Arrays;

import egovframework.com.cmm.ComDefaultVO;

/**
 * 諛쏆?履쎌??④?由?Model and VO Class 援ы쁽
 * 
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2010.06.16
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.06.16  ?λ룞??         理쒖큹 ?앹꽦
 *   2025.08.09  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-AvoidArrayLoops(諛곗뿴??媛믪쓣 猷⑦봽臾몄쓣 ?댁슜?섏뿬 蹂듭궗?섎뒗 寃?蹂대떎, System.arraycopy() 硫붿냼?쒕? ?댁슜?섏뿬 蹂듭궗?섎뒗 寃껋씠 ?⑥쑉?곸씠硫??섑뻾 ?띾룄媛 鍮좊쫫)
 *
 *      </pre>
 */
public class NoteRecptn extends ComDefaultVO {

	/**
	 * 
	 */
	private static final long serialVersionUID = 1L;

	/** 履쎌? ID */
	private String noteId;

	/** 履쎌? ?≪떊 ID */
	private String noteTrnsmitId;

	/** 履쎌? ?섏떊 ID */
	private String noteRecptnId;

	/** ?섏떊??ID */
	private String rcverId;

	/** 媛쒕큺?щ? */
	private String openYn;

	/** ?섏떊援щ텇 */
	private String recptnSe;

	/** 履쎌? ?쒕ぉ */
	private String noteSj;

	/** 履쎌? ?댁슜 */
	private String noteCn;

	/** 蹂대궦 ?쒖옉?좎쭨 */
	private String searchFromDate;

	/** 蹂대궦 醫낅즺?좎쭨 */
	private String searchToDate;

	/** 履쎌? 泥⑤??뚯씪 */
	private byte[] atchFileId;

	/** 理쒖큹?깅줉?쒖젏 */
	private String frstRegisterPnttm;

	/** 理쒖큹?깅줉?꾩씠??*/
	private String frstRegisterId;

	/** 理쒖쥌?섏젙??*/
	private String lastUpdusrPnttm;

	/** 理쒖쥌?섏젙???꾩씠??*/
	private String lastUpdusrId;

	/**
	 * @return the noteId
	 */
	public String getNoteId() {
		return noteId;
	}

	/**
	 * @param noteId the noteId to set
	 */
	public void setNoteId(String noteId) {
		this.noteId = noteId;
	}

	/**
	 * @return the noteTrnsmitId
	 */
	public String getNoteTrnsmitId() {
		return noteTrnsmitId;
	}

	/**
	 * @param noteTrnsmitId the noteTrnsmitId to set
	 */
	public void setNoteTrnsmitId(String noteTrnsmitId) {
		this.noteTrnsmitId = noteTrnsmitId;
	}

	/**
	 * @return the noteRecptnId
	 */
	public String getNoteRecptnId() {
		return noteRecptnId;
	}

	/**
	 * @param noteRecptnId the noteRecptnId to set
	 */
	public void setNoteRecptnId(String noteRecptnId) {
		this.noteRecptnId = noteRecptnId;
	}

	/**
	 * @return the rcverId
	 */
	public String getRcverId() {
		return rcverId;
	}

	/**
	 * @param rcverId the rcverId to set
	 */
	public void setRcverId(String rcverId) {
		this.rcverId = rcverId;
	}

	/**
	 * @return the openYn
	 */
	public String getOpenYn() {
		return openYn;
	}

	/**
	 * @param openYn the openYn to set
	 */
	public void setOpenYn(String openYn) {
		this.openYn = openYn;
	}

	/**
	 * @return the recptnSe
	 */
	public String getRecptnSe() {
		return recptnSe;
	}

	/**
	 * @param recptnSe the recptnSe to set
	 */
	public void setRecptnSe(String recptnSe) {
		this.recptnSe = recptnSe;
	}

	/**
	 * @return the noteSj
	 */
	public String getNoteSj() {
		return noteSj;
	}

	/**
	 * @param noteSj the noteSj to set
	 */
	public void setNoteSj(String noteSj) {
		this.noteSj = noteSj;
	}

	/**
	 * @return the noteCn
	 */
	public String getNoteCn() {
		return noteCn;
	}

	/**
	 * @param noteCn the noteCn to set
	 */
	public void setNoteCn(String noteCn) {
		this.noteCn = noteCn;
	}

	/**
	 * @return the searchFromDate
	 */
	public String getSearchFromDate() {
		return searchFromDate;
	}

	/**
	 * @param searchFromDate the searchFromDate to set
	 */
	public void setSearchFromDate(String searchFromDate) {
		this.searchFromDate = searchFromDate;
	}

	/**
	 * @return the searchToDate
	 */
	public String getSearchToDate() {
		return searchToDate;
	}

	/**
	 * @param searchToDate the searchToDate to set
	 */
	public void setSearchToDate(String searchToDate) {
		this.searchToDate = searchToDate;
	}

	/**
	 * @return the atchFileId
	 */
	public byte[] getAtchFileId() {
		return atchFileId == null ? new byte[0] : Arrays.copyOf(atchFileId, atchFileId.length);
	}

	/**
	 * @param atchFileId the atchFileId to set
	 */
	public void setAtchFileId(byte[] atchFileId) {
		if (atchFileId == null) {
			this.atchFileId = new byte[0];
		} else {
			this.atchFileId = Arrays.copyOf(atchFileId, atchFileId.length);
		}
	}

	/**
	 * @return the frstRegisterPnttm
	 */
	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}

	/**
	 * @param frstRegisterPnttm the frstRegisterPnttm to set
	 */
	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}

	/**
	 * @return the frstRegisterId
	 */
	public String getFrstRegisterId() {
		return frstRegisterId;
	}

	/**
	 * @param frstRegisterId the frstRegisterId to set
	 */
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}

	/**
	 * @return the lastUpdusrPnttm
	 */
	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}

	/**
	 * @param lastUpdusrPnttm the lastUpdusrPnttm to set
	 */
	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}

	/**
	 * @return the lastUpdusrId
	 */
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}

	/**
	 * @param lastUpdusrId the lastUpdusrId to set
	 */
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}

}
