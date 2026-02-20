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
 * ?대씪?댁뼵?몄뿉???쒕쾭濡??꾨떖?섎뒗 硫붿떆吏瑜?decoding?섎뒗 ?대옒??
 * 
 * @author ?댁쁺吏
 * @since 2014.11.27
 * @version 3.9.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2014.11.27  ?댁쁺吏          理쒖큹 ?앹꽦
 *   2025.06.24  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-UncommentedEmptyMethodBody(二쇱꽍 泥섎━?섏? ?딆? 鍮?硫붿꽌??蹂몃Ц), CloseResource(由ъ냼???リ린)
 *
 *      </pre>
 */
@Slf4j
public class MessageDecoder implements Decoder.Text<Message> {

	@Override
	public void init(EndpointConfig config) {
		// init 二쇱꽍 異붽?
	}

	@Override
	public void destroy() {
		// destroy 濡쒓렇 異붽?
	}

	/**
	 * ?붾㈃?먯꽌 ?섏뼱?ㅻ뒗 ?곗씠?곕? decoding?섎뒗 ?⑥닔
	 */
	@Override
	public Message decode(String message) throws DecodeException {
		ChatMessage chatMessage = new ChatMessage();

		// 221111 源?쒖? 2022 ?쒗걧?댁퐫??議곗튂
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
		} catch (JsonException ex) {// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
			flag = false;
		} catch (Exception ex) {
			flag = false;
		}
		return flag;
	}

}
