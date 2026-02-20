package egovframework.com.sym.sym.srv.service;

import java.util.Collections;
import java.util.List;

import lombok.Getter;
import lombok.Setter;

/**
 * <pre>
 * ??
 * - ???????????Vo ?????? ???.
 *
 * ???
 * - ??????????????????????
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
 *   2025.07.24  ????         2025????????PMD???????? ????????-MethodReturnsInternalArray(Private ??Public ????)
 *
 *      </pre>
 **/
public class ServerEqpmnRelateVO extends ServerEqpmnRelate {

	private static final long serialVersionUID = 1L;

	/**
	 * ????????
	 **/
	private List<?> serverEqpmnRelateList;

	/**
	 * ????????
	 **/
	@Getter
	@Setter
	private String delYn[];

	/**
	 * ??ID ??
	 **/
	private String strServerId;

	/**
	 * ?????
	 **/
	private String strServerNm;

	/**
	 * @return the serverEqpmnRelateList
	 **/
	public List<?> getServerEqpmnRelateList() {
		return serverEqpmnRelateList;
	}

	/**
	 * @param serverEqpmnRelateList the serverEqpmnRelateList to set
	 **/
	public void setServerEqpmnRelateList(List<?> serverEqpmnRelateList) {
		this.serverEqpmnRelateList = Collections.unmodifiableList(serverEqpmnRelateList);
	}

	/**
	 * @return the strServerId
	 **/
	public String getStrServerId() {
		return strServerId;
	}

	/**
	 * @param strServerId the strServerId to set
	 **/
	public void setStrServerId(String strServerId) {
		this.strServerId = strServerId;
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
