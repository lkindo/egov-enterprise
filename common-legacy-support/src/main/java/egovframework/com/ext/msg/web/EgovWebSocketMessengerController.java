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
 * @author ??(????)
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
 * @Description : ?????? ????????? ? ???
 * @Modification Information
 *
 *    ????      ????        ????
 *    -------        -------     -------------------
 *    2014. 11. 27.    ??
 *
 **/
@Controller
public class EgovWebSocketMessengerController {

	/**
	 * ?????? ???? ????.
	 * @param session ???????
	 * @param model ??
	 * @return view name
	 **/
	@IncludedInfo(name = "Legacy Controller", order = 3200, gid = 100)
	@RequestMapping(value="/cop/msg/websocketMessengerView.do")
	public String websocketMessengerView(HttpSession session, ModelMap model) {
		model.addAttribute("loginVO", session.getAttribute("loginVO"));
		return "egovframework/com/ext/msg/EgovMessenger";
	}

	/**
	 * ????? ??? ??(????? ????? ????.
	 * @param session ???????
	 * @param model ??
	 * @return view name
	 **/
	@RequestMapping(value="/cop/msg/websocketMessengerMain.do")
	public String websocketMessengerMain(HttpSession session, ModelMap model) {
		model.addAttribute("loginVO", session.getAttribute("loginVO"));
		return "egovframework/com/ext/msg/EgovMessengerMain";
	}

	/**
	 * ??????? ???
	 * @param roomId ??? ???
	 * @param username ????? ???
	 * @param session ???????
	 * @param model ??
	 * @return view name
	 **/
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
