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
package egovframework.com.ext.msg.server.model.encoder;

import java.util.Set;

import egovframework.com.ext.msg.server.model.ChatMessage;
import egovframework.com.ext.msg.server.model.Message;
import egovframework.com.ext.msg.server.model.UsersMessage;
import jakarta.json.Json;
import jakarta.json.JsonArrayBuilder;
import jakarta.websocket.EncodeException;
import jakarta.websocket.Encoder;
import jakarta.websocket.EndpointConfig;

/**
 * ???? ?????? ??? ????encoding?? ?????
 * 
 * @author ??
 * @since 2014.11.27
 * @version 3.9.0
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2014.11.27  ??          ????
 *   2025.06.24  ????         PMD???????? ????????-UncommentedEmptyMethodBody(????? ??? ????)
 *
 *      </pre>
 **/
public class MessageEncoder implements Encoder.Text<Message> {

	@Override
	public void init(EndpointConfig config) {
		// init
	}

	@Override
	public void destroy() {
		// destroy
	}

	/**
	 * ???? ?????? ??? ????encoding?? ??
	 **/
	@Override
	public String encode(Message message) throws EncodeException {
		String result = null;
		if (message instanceof ChatMessage) {
			ChatMessage chatMessage = (ChatMessage) message;
			result = Json.createObjectBuilder().add("messageType", chatMessage.getClass().getSimpleName())
					.add("name", chatMessage.getName()).add("message", chatMessage.getMessage()).build().toString();
		} else if (message instanceof UsersMessage) {
			UsersMessage userMessage = (UsersMessage) message;
			result = buildJsonUserData(userMessage.getUsers(), userMessage.getClass().getSimpleName());
		}
		return result;
	}

	private String buildJsonUserData(Set<String> set, String messageType) {
		JsonArrayBuilder jsonArrayBuilder = Json.createArrayBuilder();

		for (String user : set) {
			jsonArrayBuilder.add(user);
		}
		return Json.createObjectBuilder().add("messageType", messageType).add("users", jsonArrayBuilder).build()
				.toString();
	}

}
