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

 * ? ??????? ??? ??? WebSocket ???????

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

 *   2020.11.02  ???         KISA ?? ??(Random Seed???)

 *   2023.06.09  ??         NSR ? (????????????? ???????)

 *   2025.06.23  ????         PMD???????? ????????-CloseResource(?????), EmptyControlStatement(??????, UnnecessarySemicolon(???????

 *

 *      </pre>

 **/

@ServerEndpoint(value = "/usersServerEndpoint")

public class UsersServerEndPoint {

	private static final Logger LOGGER = LoggerFactory.getLogger(UsersServerEndPoint.class);

	private static Set<Session> connectedAllUsers = Collections.synchronizedSet(new HashSet<Session>());



	// Spring bean????? ??? ServerAppConfig??configurator???????.

	/*

	 * @Resource(name="TestService") TestService testService;

	 */



	/**

	 * Handshaking ??

	 * 

	 * @param userSession ?????session

	 **/

	@OnOpen

	public void handleOpen(Session userSession) {

		connectedAllUsers.add(userSession);

	}



	/**

	 * Message? ??

	 * 

	 * @param message     ??

	 * @param userSession ?????session

	 * @throws IOException

	 * @throws EncodeException

	 **/

	@OnMessage

	public void handleMessage(String message, Session userSession) throws EncodeException {

		String username = (String) userSession.getUserProperties().get("username");



		try (JsonReader jsonReader = Json.createReader(new StringReader(message));) {// 2022.01 Resources should be

																						// closed



			JsonObject jsonObject = jsonReader.readObject();



			String connectionType = jsonObject.getString("connectionType");



			if ("firstConnection".equals(connectionType) && username == null) {

				// ???? ??

				// ????? ?????

				username = EgovWebUtil.clearXSSMaximum(jsonObject.getString("username"));



				LOGGER.info(username + " is entered.");



				if (username != null && !isExisted(username)) {

					userSession.getUserProperties().put("username", username);



					for (Session session : connectedAllUsers) { // NOPMD - CloseResource

						session.getBasicRemote().sendText(buildJsonUserData(getUsers()));

					}

				} else {

					if (LOGGER.isDebugEnabled()) {

						LOGGER.debug("username????       ??      ??      ??                   ??         .");

					}

				}



			} else if ("chatConnection".equals(connectionType)) {

				// chatroomId?????webSocket url?????.

				// id generation?? ?????

				String chatroomId = genRandom();



				// ?? ????? ????????????

				// ????????????

				Set<Session> chatroomMembers = new HashSet<Session>();

				chatroomMembers.add(userSession);



				// ???????? ????? ?????

				String connectingUser = EgovWebUtil.clearXSSMaximum(jsonObject.getString("connectingUser"));



				if (connectingUser != null && !username.equals(connectingUser)) {

					// ????? ???????? ?

					for (Session session : connectedAllUsers) {// NOPMD - CloseResource

						if (connectingUser.equals(session.getUserProperties().get("username"))) {

							// ???????? chatroomMember???.

							chatroomMembers.add(session);

						}

					}



					// chatroomMembers?? room??????? ??

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

	 * ????? ?????? ??

	 * 

	 * @param userSession

	 * @throws IOException

	 * @throws EncodeException

	 **/

	// ?????!

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

	 * ????? user????????

	 * 

	 * @return user set

	 **/

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

	 * ?? ? ?? Set<String>??json?? ??????

	 * 

	 * @param set

	 * @return jsondata

	 **/

	private String buildJsonUserData(Set<String> set) {



		JsonArrayBuilder jsonArrayBuilder = Json.createArrayBuilder();



		for (String user : set) {

			jsonArrayBuilder.add(user);

		}

		return Json.createObjectBuilder().add("allUsers", jsonArrayBuilder).build().toString();

	}



	/**

	 * ????username???user session???? ??? ??

	 * 

	 * @param username ???????

	 * @return ????

	 **/

	private boolean isExisted(String username) {

		// ??? username???session???? ??

		for (Session existedUser : connectedAllUsers) {// NOPMD - CloseResource

			if (username.equals(existedUser.getUserProperties().get("username"))) {

				return true;

			}

		}

		return false;

	}



	/**

	 * chatroomId??? ????????? ??

	 * 

	 * @return chatroomId

	 **/

	private String genRandom() {

		String chatroomId = "";

		SecureRandom rnd = new SecureRandom(); // 221115 ??? 2022 ????????

		for (int i = 0; i < 8; i++) {

			chatroomId += (char) ((rnd.nextDouble() * 26) + 97);// KISA ?? ??(2018-10-29, ????

		}

		return chatroomId;

	}



}