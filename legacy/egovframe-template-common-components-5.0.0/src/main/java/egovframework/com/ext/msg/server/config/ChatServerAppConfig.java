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
package egovframework.com.ext.msg.server.config;

import java.util.HashMap;
import java.util.Map;

import egovframework.com.ext.msg.server.ChatServerEndPoint;
import jakarta.websocket.HandshakeResponse;
import jakarta.websocket.server.HandshakeRequest;
import jakarta.websocket.server.ServerEndpointConfig;
import jakarta.websocket.server.ServerEndpointConfig.Configurator;

/**
 * ?ъ슜?먮━?ㅽ듃?먯꽌 ?ㅻⅨ?ъ슜???좏깮 ?? ?ъ슜?먯? ??붽??ν븳 諛??덈줈??EndPoint 媛앹껜)??留뚮뱶??Configurator
 * 
 * @author ?댁쁺吏
 * @since 2014.11.27
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2014.11.27  ?댁쁺吏          理쒖큹 ?앹꽦
 *   2025.06.23  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-FieldNamingConventions(?꾨뱶 紐낅챸 洹쒖튃)
 *
 *      </pre>
 */
public class ChatServerAppConfig extends Configurator {

	// ??붿갹 ?쒕쾭媛앹껜(ChatServerEndPoint) ??ν븯??Map
	private final static Map<String, ChatServerEndPoint> ENDPOINT_MAP = new HashMap<String, ChatServerEndPoint>();
	private String currentUri;

	@SuppressWarnings("unchecked")
	@Override
	public <T> T getEndpointInstance(Class<T> endpointClass) throws InstantiationException {

		ChatServerEndPoint endpoint = ENDPOINT_MAP.get(currentUri);

		if (endpoint == null) {
			endpoint = new ChatServerEndPoint();
			ENDPOINT_MAP.put(currentUri, endpoint);
		}

		return (T) endpoint;
	}

	@Override
	public void modifyHandshake(ServerEndpointConfig sec, HandshakeRequest request, HandshakeResponse response) {
		currentUri = request.getRequestURI().toString();
		super.modifyHandshake(sec, request, response);
	}
}
