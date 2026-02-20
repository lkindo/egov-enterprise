package egovframework.com.sym.tbm.tbr.service;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * <pre>
 * ??
 * - ????????Vo ?????? ???.
 *
 * ???
 * - ????????? ??, ?????? ????
 * </pre>
 * 
 * @author ??
 * @since 2010.06.28
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2010.06.28  ??          ????
 *   2025.07.28  ????         2025????????PMD???????? ????????-AvoidArrayLoops(?????? ???? ?? ???? System.arraycopy() ???? ???? ?? ???????? ?? ???
 *
 *      </pre>
 **/
public class TroblReqstVO extends TroblReqst {

	private static final long serialVersionUID = 1L;
	/**
	 * ?? ?
	 **/
	private List<TroblReqstVO> troblReqstList;
	/**
	 * ????
	 **/
	private String strTroblNm;
	/**
	 * ?? ??
	 **/
	private String strTroblKnd;
	/**
	 * ?? ??
	 **/
	private String strProcessSttus;

	/**
	 * ????????
	 **/
	private String delYn[];

	/**
	 * @return the troblReqstList
	 **/
	public List<TroblReqstVO> getTroblReqstList() {
		return troblReqstList;
	}

	/**
	 * @param troblReqstList the troblReqstList to set
	 **/
	public void setTroblReqstList(List<TroblReqstVO> troblReqstList) {
		this.troblReqstList = Collections.unmodifiableList(troblReqstList);
	}

	/**
	 * @return the strTroblNm
	 **/
	public String getStrTroblNm() {
		return strTroblNm;
	}

	/**
	 * @param strTroblNm the strTroblNm to set
	 **/
	public void setStrTroblNm(String strTroblNm) {
		this.strTroblNm = strTroblNm;
	}

	/**
	 * @return the strTroblKnd
	 **/
	public String getStrTroblKnd() {
		return strTroblKnd;
	}

	/**
	 * @param strTroblKnd the strTroblKnd to set
	 **/
	public void setStrTroblKnd(String strTroblKnd) {
		this.strTroblKnd = strTroblKnd;
	}

	/**
	 * @return the strProcessSttus
	 **/
	public String getStrProcessSttus() {
		return strProcessSttus;
	}

	/**
	 * @param strProcessSttus the strProcessSttus to set
	 **/
	public void setStrProcessSttus(String strProcessSttus) {
		this.strProcessSttus = strProcessSttus;
	}

	/**
	 * @return the delYn
	 **/
	public String[] getDelYn() {
		return delYn == null ? new String[0] : Arrays.copyOf(delYn, delYn.length);
	}

	/**
	 * @param delYn the delYn to set
	 **/
	public void setDelYn(String[] delYn) {
		if (delYn == null) {
			this.delYn = new String[0];
		} else {
			this.delYn = Arrays.copyOf(delYn, delYn.length);
		}
	}

}
