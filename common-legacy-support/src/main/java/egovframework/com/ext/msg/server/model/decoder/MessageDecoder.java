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
package egovframework.com.ext.msg.server.model.decoder;

import java.io.StringReader;

import egovframework.com.ext.msg.server.model.ChatMessage;
import egovframework.com.ext.msg.server.model.Message;
import jakarta.json.Json;
import jakarta.json.JsonException;
import jakarta.json.JsonObject;
import jakarta.json.JsonReader;
import jakarta.websocket.DecodeException;
import jakarta.websocket.Decoder;
import jakarta.websocket.EndpointConfig;
import lombok.extern.slf4j.Slf4j;

/**
 * ?????????????? ????decoding?? ?????
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
 *   2025.06.24  ????         PMD???????? ????????-UncommentedEmptyMethodBody(????? ??? ????), CloseResource(?????)
 *
 *      </pre>
 **/
@Slf4j
public class MessageDecoder implements Decoder.Text<Message> {

	@Override
	public void init(EndpointConfig config) {
		// init ???
	}

	@Override
	public void destroy() {
		// destroy ????
	}

	/**
	 * ??? ???? ??? decoding?? ??
	 **/
	@Override
	public Message decode(String message) throws DecodeException {
		ChatMessage chatMessage = new ChatMessage();

		// 221111 ??? 2022 ????????
		JsonObject jsonObject = null;

		try (StringReader stringReader = new StringReader(message);
				JsonReader jsonReader = Json.createReader(stringReader);) {
			jsonObject = jsonReader.readObject();
			chatMessage.setMessage(jsonObject.getString("message"));
			chatMessage.setRoom(jsonObject.getString("room"));
		} catch (JsonException ex) {
			if (log.isErrorEnabled()) {
				log.error(ex.getMessage());
			}
		} finally {
			if (jsonObject != null) {
				jsonObject = null;
			}
		}

		return chatMessage;
	}

	@Override
	public boolean willDecode(String message) {
		boolean flag = true;

		try (JsonReader jsonReader = Json.createReader(new StringReader(message));) {
			jsonReader.readObject();
		} catch (JsonException ex) {// KISA ?? ??(2018-10-29, ????
			flag = false;
		} catch (Exception ex) {
			flag = false;
		}
		return flag;
	}

}
