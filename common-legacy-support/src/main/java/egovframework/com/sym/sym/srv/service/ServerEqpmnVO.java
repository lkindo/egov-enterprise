package egovframework.com.sym.sym.srv.service;

import java.util.Collections;
import java.util.List;

import lombok.Getter;
import lombok.Setter;

/**
 * <pre>
 * ??
 * - ??????????Vo ?????? ???.
 *
 * ???
 * - ????????????????????
 * </pre>
 * 
 * @author ??
 * 
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
public class ServerEqpmnVO extends ServerEqpmn {

	private static final long serialVersionUID = 1L;

	/**
	 * ?? ????
	 **/
	private List<?> serverEqpmnList;

	/**
	 * ????????
	 **/
	@Getter
	@Setter
	private String delYn[];

	/**
	 * ???????
	 **/
	private String strServerEqpmnNm;

	/**
	 * @return the serverEqpmnList
	 **/
	public List<?> getServerEqpmnList() {
		return serverEqpmnList;
	}

	/**
	 * @param serverEqpmnList the serverEqpmnList to set
	 **/
	public void setServerEqpmnList(List<?> serverEqpmnList) {
		this.serverEqpmnList = Collections.unmodifiableList(serverEqpmnList);
	}

	/**
	 * @return the strServerEqpmnNm
	 **/
	public String getStrServerEqpmnNm() {
		return strServerEqpmnNm;
	}

	/**
	 * @param strServerEqpmnNm the strServerEqpmnNm to set
	 **/
	public void setStrServerEqpmnNm(String strServerEqpmnNm) {
		this.strServerEqpmnNm = strServerEqpmnNm;
	}
}
