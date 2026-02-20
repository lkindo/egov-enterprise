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
package egovframework.com.ext.msg.server.model;

/**
* @Class Name : ChatMessage.java
* @Description : ????? ????VO
* @Modification Information
*
*    ????      ????        ????
*    -------        -------     -------------------
*    2014. 11. 27.    ??
*
**/
public class ChatMessage implements Message{

	/**
	 * ?????
	 **/
	private String name;

	/**
	 * room Id
	 **/
	private String room;

	/**
	 * ? ??
	 **/
	private String message;

	public String getName() {
		return name;
	}
	public void setName(String name) {
		this.name = name;
	}
	public String getMessage() {
		return message;
	}
	public void setMessage(String message) {
		this.message = message;
	}
	public String getRoom() {
		return room;
	}
	public void setRoom(String room) {
		this.room = room;
	}
}
