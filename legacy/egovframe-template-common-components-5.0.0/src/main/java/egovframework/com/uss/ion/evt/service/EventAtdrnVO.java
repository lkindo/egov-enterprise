package egovframework.com.uss.ion.evt.service;

import java.io.Serializable;
import java.util.List;

/**
 * 媛쒖슂
 * - ?됱궗李몄꽍?먯뿉 ???Vo ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?됱궗李몄꽍?먯쓽 紐⑸줉 ??ぉ??愿由ы븳??
 * @author ?댁슜
 * @version 1.0
 * @created 06-15-2010 ?ㅽ썑 2:08:56
 */

public class EventAtdrnVO extends EventAtdrn implements Serializable {

	/**
	 * serialVersionUID
	 */
	private static final long serialVersionUID = 1L;
	/**
	 * 諛곕꼫 紐⑸줉
	 */
	List<EventAtdrnVO> eventAtdrnList;

	/**
	 * @return the eventAtdrnList
	 */
	public List<EventAtdrnVO> getEventAtdrnList() {
		return eventAtdrnList;
	}
	/**
	 * @param eventManage the eventManage to set
	 */
	public void setEventAtdrnList(List<EventAtdrnVO> eventAtdrnList) {
		this.eventAtdrnList = eventAtdrnList;
	}



}
