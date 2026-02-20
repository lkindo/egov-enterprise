package egovframework.com.cop.smt.mtm.service;

import java.io.Serializable;

/**
 * ??
 * - ????????model ?????? ???.
 * 
 * ???
 * - ?ID, ???, ?????, ????, ??, ??? ?????????
 * 
 * @author ???
 * @version 1.0
 * @created 19-7-2010 ?? 10:12:47
 * 
 *          <pre>
 * << ?????Modification Information) >>
 *   
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2010.7.19	???         ????
 *
 *          </pre>
 **/
public class MemoTodo implements Serializable {
	private static final long serialVersionUID = 1L;

	/** ?ID **/
	private String todoId;
	/** ??? **/
	private String todoNm;
	/** ????? **/
	private String todoBeginTime;
	/** ???? **/
	private String todoEndTime;
	/** ??? **/
	private String todoDe;
	/** ?????**/
	private String todoBeginHour;
	/** ?????**/
	private String todoBeginMin;
	/** ????**/
	private String todoEndHour;
	/** ???**/
	private String todoEndMin;
	/** ?? **/
	private String wrterId;
	/** ??? **/
	private String wrterNm;
	/** ??? **/
	private String todoCn;
	/** ??? **/
	private String frstRegisterId = "";
	/** ???? **/
	private String frstRegisterPnttm = "";
	/** ??? **/
	private String lastUpdusrId = "";
	/** ???? **/
	private String lastUpdusrPnttm = "";

	public String getTodoId() {
		return todoId;
	}

	public void setTodoId(String todoId) {
		this.todoId = todoId;
	}

	public String getTodoNm() {
		return todoNm;
	}

	public void setTodoNm(String todoNm) {
		this.todoNm = todoNm;
	}

	public String getTodoBeginTime() {
		return todoBeginTime;
	}

	public void setTodoBeginTime(String todoBeginTime) {
		this.todoBeginTime = todoBeginTime;
	}

	public String getTodoEndTime() {
		return todoEndTime;
	}

	public void setTodoEndTime(String todoEndTime) {
		this.todoEndTime = todoEndTime;
	}

	public String getTodoDe() {
		return todoDe;
	}

	public void setTodoDe(String todoDe) {
		this.todoDe = todoDe;
	}

	public String getTodoBeginHour() {
		return todoBeginHour;
	}

	public void setTodoBeginHour(String todoBeginHour) {
		this.todoBeginHour = todoBeginHour;
	}

	public String getTodoBeginMin() {
		return todoBeginMin;
	}

	public void setTodoBeginMin(String todoBeginMin) {
		this.todoBeginMin = todoBeginMin;
	}

	public String getTodoEndHour() {
		return todoEndHour;
	}

	public void setTodoEndHour(String todoEndHour) {
		this.todoEndHour = todoEndHour;
	}

	public String getTodoEndMin() {
		return todoEndMin;
	}

	public void setTodoEndMin(String todoEndMin) {
		this.todoEndMin = todoEndMin;
	}

	public String getWrterId() {
		return wrterId;
	}

	public void setWrterId(String wrterId) {
		this.wrterId = wrterId;
	}

	public String getWrterNm() {
		return wrterNm;
	}

	public void setWrterNm(String wrterNm) {
		this.wrterNm = wrterNm;
	}

	public String getTodoCn() {
		return todoCn;
	}

	public void setTodoCn(String todoCn) {
		this.todoCn = todoCn;
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

}
