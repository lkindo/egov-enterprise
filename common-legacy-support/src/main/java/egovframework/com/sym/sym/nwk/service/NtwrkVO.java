package egovframework.com.sym.sym.nwk.service;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * <pre>
 * ??
 * - ??????????Vo ?????? ???.
 *
 * ???
 * - ??????????? ?? ? ????
 * </pre>
 * 
 * @author lee.m.j
 * @since 2010.08.19
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2010.08.19  lee.m.j       ????
 *   2025.07.22  ????         2025????????PMD???????? ????????-AvoidArrayLoops(?????? ???? ?? ???? System.arraycopy() ???? ???? ?? ???????? ?? ???
 *
 *      </pre>
 **/
public class NtwrkVO extends Ntwrk {

	private static final long serialVersionUID = 1L;

	/**
	 * ???
	 **/
	private String strManageIem;
	/**
	 * ?????
	 **/
	private String strUserNm;
	/**
	 * ?????
	 **/
	private List<NtwrkVO> ntwrkList;
	/**
	 * ??????
	 **/
	private String delYn[];

	/**
	 * @return the strManageIem
	 **/

	public String getStrManageIem() {
		return strManageIem;
	}

	/**
	 * @param strManageIem the strManageIem to set
	 **/
	public void setStrManageIem(String strManageIem) {
		this.strManageIem = strManageIem;
	}

	/**
	 * @return the strUserNm
	 **/
	public String getStrUserNm() {
		return strUserNm;
	}

	/**
	 * @param strUserNm the strUserNm to set
	 **/
	public void setStrUserNm(String strUserNm) {
		this.strUserNm = strUserNm;
	}

	/**
	 * @return the ntwrkList
	 **/
	public List<NtwrkVO> getNtwrkList() {
		return ntwrkList;
	}

	/**
	 * @param ntwrkList the ntwrkList to set
	 **/
	public void setNtwrkList(List<NtwrkVO> ntwrkList) {
		this.ntwrkList = Collections.unmodifiableList(ntwrkList);
	}

	/**
	 * @return the delYn
	 **/
	public String[] getDelYn() {
		if (delYn == null) {
			return null;
		}
		return Arrays.copyOf(delYn, delYn.length);  // System.arraycopy ????????
	}
	
	/**
	 * @param delYn the delYn to set
	 **/
	public void setDelYn(String[] delYn) {
		if (delYn == null) {
			this.delYn = null;
		} else {
			this.delYn = Arrays.copyOf(delYn, delYn.length);
		}
	}

}
