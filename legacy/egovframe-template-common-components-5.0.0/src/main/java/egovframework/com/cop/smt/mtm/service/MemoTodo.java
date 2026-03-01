package egovframework.com.cop.smt.mtm.service;

import java.io.Serializable;

/**
 * 媛쒖슂
 * - 硫붾え?좎씪?????model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?좎씪ID, ?좎씪?쒕ぉ, ?좎씪?쒖옉?쒓컙, ?좎씪醫낅즺?쒓컙, ?묒꽦?륤D, ?좎씪?댁슜 ??ぉ??愿由ы븳??
 * @author ?μ쿋??
 * @version 1.0
 * @created 19-7-2010 ?ㅼ쟾 10:12:47
 *   <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.7.19	?μ쿋??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@SuppressWarnings("serial")
public class MemoTodo implements Serializable {

	/** ?좎씪ID */
	private String todoId;
	/** ?좎씪?쒕ぉ */
	private String todoNm;
	/** ?좎씪?쒖옉?쒓컙 */
	private String todoBeginTime;
	/** ?좎씪醫낅즺?쒓컙 */
	private String todoEndTime;
	/** ?좎씪?쇱옄 */
	private String todoDe;
	/** ?좎씪?쒖옉??*/
	private String todoBeginHour;
	/** ?좎씪?쒖옉遺?*/
	private String todoBeginMin;
	/** ?좎씪醫낅즺??*/
	private String todoEndHour;
	/** ?좎씪醫낅즺遺?*/
	private String todoEndMin;
	/** ?묒꽦?륤D */
	private String wrterId;
	/** ?묒꽦?먮챸 */
	private String wrterNm;
	/** ?좎씪?댁슜 */
	private String todoCn;
	/** 理쒖큹?깅줉?륤D */
	private String frstRegisterId = "";
	/** 理쒖큹?깅줉?쒖젏 */
	private String frstRegisterPnttm = "";
	/** 理쒖쥌?섏젙?륤D */
	private String lastUpdusrId = "";
	/** 理쒖쥌?섏젙?쒖젏 */
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
