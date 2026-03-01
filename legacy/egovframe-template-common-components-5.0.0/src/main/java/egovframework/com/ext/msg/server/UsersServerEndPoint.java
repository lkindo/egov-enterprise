*
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
import java.io.StringReader;
import java.security.SecureRandom;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import egovframework.com.cmm.EgovWebUtil;
import jakarta.json.Json;
import jakarta.json.JsonArrayBuilder;
import jakarta.json.JsonObject;
import jakarta.json.JsonReader;
import jakarta.websocket.EncodeException;
import jakarta.websocket.OnClose;
import jakarta.websocket.OnMessage;
import jakarta.websocket.OnOpen;
import jakarta.websocket.Session;
import jakarta.websocket.server.ServerEndpoint;

/**
 * ?꾩옱 媛?ν븳 ??붿궗?⑹옄 由ъ뒪?몃? 泥섎━?섎뒗 WebSocket ?쒕쾭?대옒??
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
 *   2020.11.02  ?좎슜??         KISA 蹂댁븞?쎌젏 議곗튂 (Random Seed媛?異붽?)
 *   2023.06.09  源?ν븯          NSR 蹂댁븞議곗튂 (?ъ슜?먯씠由??щ줈?ㅼ궗?댄듃 ?ㅽ겕由쏀듃 諛⑹?)
 *   2025.06.23  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-CloseResource(由ъ냼???リ린), EmptyControlStatement(鍮??쒖뼱臾?, UnnecessarySemicolon(遺덊븘?뷀븳 ?몃?肄쒕줎)
 *
 *      </pre>
 */
@ServerEndpoint(value = "/usersServerEndpoint"/* ,configurator=ServerAppConfig.class */)
public class UsersServerEndPoint {
	private static final Logger LOGGER = LoggerFactory.getLogger(UsersServerEndPoint.class);
	private static Set<Session> connectedAllUsers = Collections.synchronizedSet(new HashSet<Session>());

	// Spring bean怨??곕룞?섍린 ?꾪빐?쒕뒗 ServerAppConfig瑜?configurator濡??깅줉?댁＜硫??쒕떎.
	/*
	 * @Resource(name="TestService") TestService testService;
	 */

	/**
	 * Handshaking ?⑥닔
	 * 
	 * @param userSession ?ъ슜??session
	 */
	@OnOpen
	public void handleOpen(Session userSession) {
		connectedAllUsers.add(userSession);
	}

	/**
	 * Message?꾨떖 ?⑥닔
	 * 
	 * @param message     硫붿떆吏
	 * @param userSession ?ъ슜??session
	 * @throws IOException
	 * @throws EncodeException
	 */
	@OnMessage
	public void handleMessage(String message, Session userSession) throws EncodeException {
		String username = (String) userSession.getUserProperties().get("username");

		try (JsonReader jsonReader = Json.createReader(new StringReader(message));) {// 2022.01 Resources should be
																						// closed

			JsonObject jsonObject = jsonReader.readObject();

			String connectionType = jsonObject.getString("connectionType");

			if ("firstConnection".equals(connectionType) && username == null) {
				// 留?泥섏쓬 ?묒냽 ??
				// ?ъ슜?먯쓽 ?대쫫??媛?몄샂
				username = EgovWebUtil.clearXSSMaximum(jsonObject.getString("username"));

				LOGGER.info(username + " is entered.");

				if (username != null && !isExisted(username)) {
					userSession.getUserProperties().put("username", username);

					for (Session session : connectedAllUsers) { // NOPMD - CloseResource
						session.getBasicRemote().sendText(buildJsonUserData(getUsers()));
					}
				} else {
					if (LOGGER.isDebugEnabled()) {
						LOGGER.debug("username???ㅼ떆 ?낅젰?섍쾶?섎뒗 濡쒖쭅 ?ｊ린.");
					}
				}

			} else if ("chatConnection".equals(connectionType)) {
				// chatroomId濡??먮떎瑜?webSocket url???묎렐?쒕떎.
				// id generation?쇰줈 ?泥닿???
				String chatroomId = genRandom();

				// ?ㅻⅨ ?ъ슜?먯? ??뷀븯怨좎옄 ?쒕룄????
				// 梨꾪똿猷??ъ슜?????
				Set<Session> chatroomMembers = new HashSet<Session>();
				chatroomMembers.add(userSession);

				// ?좏깮???ъ슜?먮? ?ъ슜?먮뱾 ?덉뿉??李얘린.
				String connectingUser = EgovWebUtil.clearXSSMaximum(jsonObject.getString("connectingUser"));

				if (connectingUser != null && !username.equals(connectingUser)) {
					// ?ъ슜?먮뱾 以??좏깮???좎?? ?곌껐
					for (Session session : connectedAllUsers) {// NOPMD - CloseResource
						if (connectingUser.equals(session.getUserProperties().get("username"))) {
							// ?좏깮???ъ슜?먮㈃ chatroomMember濡?異붽?.
							chatroomMembers.add(session);
						}
					}

					// chatroomMembers?먭쾶 room?낆옣?섎씪???좏샇 蹂대궡湲?
					for (Session session : chatroomMembers) {// NOPMD - CloseResource

						session.getBasicRemote()
								.sendText(Json.createObjectBuilder().add("enterChatId", chatroomId)
										.add("username", (String) session.getUserProperties().get("username")).build()
										.toString());
					}
				}
			}

		} catch (IOException ioe) {
			LOGGER.error("UsersServerEndPoint IOException", ioe);
		} catch (Exception e) {
			LOGGER.error("UsersServerEndPoint Exception", e);
		}

	}

	/**
	 * ?곌껐???딄린 吏곸쟾???몄텧?섎뒗 ?⑥닔
	 * 
	 * @param userSession
	 * @throws IOException
	 * @throws EncodeException
	 */
	// ?덉쇅泥섎━ ?꾩슂!
	@OnClose
	public void handleClose(Session userSession) throws IOException, EncodeException {

		String disconnectedUser = (String) userSession.getUserProperties().get("username");
		connectedAllUsers.remove(userSession);

		if (disconnectedUser != null) {
			Json.createObjectBuilder().add("disconnectedUser", disconnectedUser).build().toString();

			for (Session session : connectedAllUsers) {// NOPMD - CloseResource
				session.getBasicRemote().sendText(
						Json.createObjectBuilder().add("disconnectedUser", disconnectedUser).build().toString());
			}
		}
	}

	/**
	 * ?곌껐?섏뼱?덈뒗 user?뺣낫瑜?媛?몄삤???⑥닔
	 * 
	 * @return user set
	 */
	private Set<String> getUsers() {
		HashSet<String> returnSet = new HashSet<String>();

		for (Session session : connectedAllUsers) { // NOPMD - CloseResource
			if (session.getUserProperties().get("username") != null) {
				returnSet.add(session.getUserProperties().get("username").toString());
			}
		}
		return returnSet;
	}

	/**
	 * ?좎? ?뺣낫媛 ?닿릿 Set<String>??json?쇰줈 蹂?섑빐二쇰뒗 ?⑥닔
	 * 
	 * @param set
	 * @return jsondata
	 */
	private String buildJsonUserData(Set<String> set) {

		JsonArrayBuilder jsonArrayBuilder = Json.createArrayBuilder();

		for (String user : set) {
			jsonArrayBuilder.add(user);
		}
		return Json.createObjectBuilder().add("allUsers", jsonArrayBuilder).build().toString();
	}

	/**
	 * ?숈씪??username??媛吏?user session???덈뒗吏 ?뺤씤?섎뒗 ?⑥닔
	 * 
	 * @param username ?ъ슜?먯씠由?
	 * @return 議댁옱?щ?
	 */
	private boolean isExisted(String username) {
		// ?대? username??媛吏?session???덈뒗吏 寃??
		for (Session existedUser : connectedAllUsers) {// NOPMD - CloseResource
			if (username.equals(existedUser.getUserProperties().get("username"))) {
				return true;
			}
		}
		return false;
	}

	/**
	 * chatroomId瑜??꾪븳 ?쒕뜡媛믪쓣 ?앹꽦?섎뒗 ?⑥닔
	 * 
	 * @return chatroomId
	 */
	private String genRandom() {
		String chatroomId = "";
		SecureRandom rnd = new SecureRandom(); // 221115 源?쒖? 2022 ?쒗걧?댁퐫??議곗튂
		for (int i = 0; i < 8; i++) {
			chatroomId += (char) ((rnd.nextDouble() * 26) + 97);// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
		}
		return chatroomId;
	}

}
