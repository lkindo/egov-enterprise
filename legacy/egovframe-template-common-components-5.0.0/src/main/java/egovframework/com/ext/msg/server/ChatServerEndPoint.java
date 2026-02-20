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
package egovframework.com.ext.msg.server;

import java.io.IOException;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.ext.msg.server.config.ChatServerAppConfig;
import egovframework.com.ext.msg.server.model.ChatMessage;
import egovframework.com.ext.msg.server.model.Message;
import egovframework.com.ext.msg.server.model.UsersMessage;
import egovframework.com.ext.msg.server.model.decoder.MessageDecoder;
import egovframework.com.ext.msg.server.model.encoder.MessageEncoder;
import jakarta.websocket.EncodeException;
import jakarta.websocket.OnClose;
import jakarta.websocket.OnError;
import jakarta.websocket.OnMessage;
import jakarta.websocket.OnOpen;
import jakarta.websocket.Session;
import jakarta.websocket.server.PathParam;
import jakarta.websocket.server.ServerEndpoint;

/**
 * ??紐낆쓽 ?ъ슜?먭? ??뷀븷 ???묒냽 泥섎━諛?硫붿떆吏泥섎━ 湲곕뒫???섎뒗 WebSocket ?쒕쾭?대옒??
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
 *   2023.06.09  源?ν븯          NSR 蹂댁븞議곗튂 (?ъ슜?먮ぉ濡??щ줈?ㅼ궗?댄듃 ?ㅽ겕由쏀듃 諛⑹?)
 *   2025.06.21  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-ImmutableField(遺덈??꾨뱶), CloseResource(由ъ냼???リ린)
 *
 *      </pre>
 */
@ServerEndpoint(value = "/chat/{room}", encoders = { MessageEncoder.class }, decoders = {
		MessageDecoder.class }, configurator = ChatServerAppConfig.class)
public class ChatServerEndPoint {
	private static final Logger LOGGER = LoggerFactory.getLogger(ChatServerEndPoint.class);
	private final Set<Session> chatroomUsers = Collections.synchronizedSet(new HashSet<Session>());

	/**
	 * Handshaking ?⑥닔
	 * 
	 * @param userSession ?ъ슜??session
	 */
	@OnOpen
	public void handleOpen(Session userSession, @PathParam("room") final String room)
			throws IOException, EncodeException {
		userSession.getUserProperties().put("room", room);
		chatroomUsers.add(userSession);
	}

	/**
	 * 硫붿떆吏 ?꾨떖 ?⑥닔
	 * 
	 * @param incomingMessage ?ㅼ뼱?ㅻ뒗 硫붿떆吏
	 * @param userSession     ?ъ슜??session
	 * @param room            room Id
	 * @throws IOException
	 * @throws EncodeException
	 */
	@OnMessage
	public void handleMessage(Message incomingMessage, Session userSession, @PathParam("room") final String room)
			throws IOException, EncodeException {

		ChatMessage incomingChatMessage = (ChatMessage) incomingMessage;
		ChatMessage outgoingChatMessage = new ChatMessage();

		String username = (String) userSession.getUserProperties().get("username");
		String filteredIncommingMessage = EgovWebUtil.clearXSSMaximum(incomingChatMessage.getMessage());

		if (username == null) {
			username = filteredIncommingMessage;

			if (username != null) {
				userSession.getUserProperties().put("username", username);
			}

			synchronized (chatroomUsers) {
				for (Session session : chatroomUsers) { // NOPMD-CloseResource
					session.getBasicRemote().sendObject(new UsersMessage(getUsers()));
				}
			}
		} else {
			outgoingChatMessage.setName(username);
			outgoingChatMessage.setMessage(filteredIncommingMessage);

			for (Session session : chatroomUsers) { // NOPMD-CloseResource
				session.getBasicRemote().sendObject(outgoingChatMessage);
			}
		}
	}

	// ?꾧뎔媛媛 ?묒냽 ?딆쓣??
	@OnClose
	public void handleClose(Session userSession, @PathParam("room") final String room)
			throws IOException, EncodeException {
		chatroomUsers.remove(userSession);

		for (Session session : chatroomUsers) { // NOPMD-CloseResource
			session.getBasicRemote().sendObject(new UsersMessage(getUsers()));
		}
	}

	/**
	 * ?ъ슜?먭? ?묒냽 ?딄린 ???몄텧?섎뒗 ?⑥닔
	 * 
	 * @param session
	 * @param throwable
	 * @param room
	 */
	@OnError
	public void handleError(Session session, Throwable throwable, @PathParam("room") final String room) {
		// Error handling
		LOGGER.info("ChatServerEndPoint (room: " + room + ") occured Exception!");
		LOGGER.info("Exception : " + throwable.getMessage());
	}

	/**
	 * ?ъ슜???뺣낫瑜?媛?몄삤???⑥닔
	 * 
	 * @return
	 */
	private Set<String> getUsers() {
		HashSet<String> returnSet = new HashSet<String>();

		for (Session session : chatroomUsers) { // NOPMD-CloseResource
			if (session.getUserProperties().get("username") != null) {
				returnSet.add(session.getUserProperties().get("username").toString());
			}
		}
		return returnSet;
	}

}
