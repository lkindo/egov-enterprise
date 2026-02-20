package egovframework.com.sym.sym.srv.service;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * <pre>
 * ??
 * - ?????????Vo ?????? ???.
 *
 * ???
 * - ???????????????????
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
 *   2020-08-28  ???         ?? ??(Private ??Public ????[CWE-496])
 *   2025.07.25  ????         2025????????PMD???????? ????????-MethodReturnsInternalArray(Private ??Public ????)
 *
 *      </pre>
 **/
public class ServerVO extends Server {

	private static final long serialVersionUID = 1L;

	/**
	 * ?? ?
	 **/
	private List<?> serverList;

	/**
	 * ????????
	 **/
	private String delYn[];

	/**
	 * ?????
	 **/
	private String strServerNm;

	/**
	 * @return the serverList
	 **/
	public List<?> getServerList() {
		return serverList;
	}

	/**
	 * @param serverList the serverList to set
	 **/
	public void setServerList(List<?> serverList) {
		this.serverList = Collections.unmodifiableList(serverList);
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

	/**
	 * @return the strServerNm
	 **/
	public String getStrServerNm() {
		return strServerNm;
	}

	/**
	 * @param strServerNm the strServerNm to set
	 **/
	public void setStrServerNm(String strServerNm) {
		this.strServerNm = strServerNm;
	}
}
