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
package egovframework.com.ext.msg.server.config;

import java.util.HashMap;
import java.util.Map;

import egovframework.com.ext.msg.server.ChatServerEndPoint;
import jakarta.websocket.HandshakeResponse;
import jakarta.websocket.server.HandshakeRequest;
import jakarta.websocket.server.ServerEndpointConfig;
import jakarta.websocket.server.ServerEndpointConfig.Configurator;

/**
 * ????????? ???????? ?? ????? ???????????EndPoint ?????Configurator
 * 
 * @author ??
 * @since 2014.11.27
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2014.11.27  ??          ????
 *   2025.06.23  ????         PMD???????? ????????-FieldNamingConventions(? ???
 *
 *      </pre>
 **/
public class ChatServerAppConfig extends Configurator {

	// ??? ???ChatServerEndPoint) ?????Map
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
