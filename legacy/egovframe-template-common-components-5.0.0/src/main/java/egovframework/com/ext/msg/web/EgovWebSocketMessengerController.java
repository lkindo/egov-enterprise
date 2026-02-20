/*
 * eGovFrame Web Messager
 * Copyright The eGovFrame Open Community (http://open.egovframe.go.kr)).
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @author ?댁쁺吏(?덊띁媛쒕컻?륦3)
 */
package egovframework.com.ext.msg.web;

import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.annotation.IncludedInfo;
import jakarta.servlet.http.HttpSession;

/**
 * @Class Name : EgovWebSocketMessengerController.java
 * @Description : ?뱀냼耳?硫붿떊? 硫붿씤?붾㈃???섑??닿린 ?꾪븳 而⑦듃濡ㅻ윭
 * @Modification Information
 *
 *    ?섏젙??      ?섏젙??        ?섏젙?댁슜
 *    -------        -------     -------------------
 *    2014. 11. 27.    ?댁쁺吏
 *
 */
@Controller
public class EgovWebSocketMessengerController {

	/**
	 * ?뱀냼耳?硫붿떊? ?묒냽?붾㈃?쇰줈 ?대룞?쒕떎.
	 * @param session ?ъ슜?먯꽭??
	 * @param model 紐⑤뜽
	 * @return view name
	 */
	@IncludedInfo(name="?뱀냼耳?硫붿떊?", order = 3200, gid = 100)
	@RequestMapping(value="/cop/msg/websocketMessengerView.do")
	public String websocketMessengerView(HttpSession session, ModelMap model) {
		model.addAttribute("loginVO", session.getAttribute("loginVO"));
		return "egovframework/com/ext/msg/EgovMessenger";
	}

	/**
	 * ???뚯폆 硫붿떊? 硫붿씤?붾㈃(??붿긽? 由ъ뒪?명솕硫??쇰줈 ?대룞?쒕떎.
	 * @param session ?ъ슜?먯꽭??
	 * @param model 紐⑤뜽
	 * @return view name
	 */
	@RequestMapping(value="/cop/msg/websocketMessengerMain.do")
	public String websocketMessengerMain(HttpSession session, ModelMap model) {
		model.addAttribute("loginVO", session.getAttribute("loginVO"));
		return "egovframework/com/ext/msg/EgovMessengerMain";
	}

	/**
	 * ??붿갹???덈줈 ?꾩슫??
	 * @param roomId ??붿갹 ?꾩씠??
	 * @param username ??붿긽? ?대쫫
	 * @param session ?ъ슜?먯꽭??
	 * @param model 紐⑤뜽
	 * @return view name
	 */
	@RequestMapping(value="/cop/msg/websocketMessengePopup.do")
	public String websocketMessengePopup(@RequestParam(value="roomId") String roomId,
										 @RequestParam(value="username") String username,
										 HttpSession session, ModelMap model) {
		model.addAttribute("loginVO", session.getAttribute("loginVO"));
		model.addAttribute("roomId", roomId);
		model.addAttribute("username", username);
		return "egovframework/com/ext/msg/popup/chatPopupBubble";
	}
}
