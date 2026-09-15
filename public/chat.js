/* global document, EventSource, fetch, FormData */

const chat = document.querySelector("[data-realtime-chat]");

if (chat) {
  const conversationId = chat.dataset.conversationId;
  const form = chat.querySelector("[data-chat-form]");
  const errorMessage = chat.querySelector("[data-chat-error]");
  const eventSource = new EventSource(`/conversations/${conversationId}/events`);

  function getMessageList() {
    let messageList = chat.querySelector("[data-message-list]");

    if (messageList) {
      return messageList;
    }

    chat.querySelector("[data-empty-message]")?.remove();
    messageList = document.createElement("ol");
    messageList.className = "message-list";
    messageList.dataset.messageList = "";
    messageList.setAttribute("aria-label", "저장된 대화 내용");
    form.before(messageList);
    return messageList;
  }

  function appendMessage(message) {
    if (document.querySelector(`[data-message-id="${message.id}"]`)) {
      return;
    }

    const item = document.createElement("li");
    item.className = message.isMyMessage
      ? "message-item my-message"
      : "message-item";
    item.dataset.messageId = message.id;

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.title = message.avatarCode;
    avatar.textContent = message.senderName.slice(0, 1);

    const body = document.createElement("div");
    body.className = "message-body";

    const metadata = document.createElement("p");
    metadata.className = "message-meta";

    const senderName = document.createElement("strong");
    senderName.textContent = message.senderName;

    const time = document.createElement("time");
    const createdAt = new Date(message.createdAt);
    time.dateTime = message.createdAt;
    time.textContent = new Intl.DateTimeFormat("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Seoul"
    }).format(createdAt);

    const content = document.createElement("p");
    content.className = "message-content";
    content.textContent = message.content;

    metadata.append(senderName, time);
    body.append(metadata, content);
    item.append(avatar, body);
    getMessageList().append(item);
    item.scrollIntoView({ behavior: "smooth", block: "end" });
  }

  eventSource.addEventListener("message", (event) => {
    appendMessage(JSON.parse(event.data));
  });

  eventSource.addEventListener("error", () => {
    errorMessage.hidden = false;
    errorMessage.textContent = "실시간 연결을 다시 시도하고 있습니다.";
  });

  eventSource.addEventListener("open", () => {
    errorMessage.hidden = true;
    errorMessage.textContent = "";
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector("button[type='submit']");
    submitButton.disabled = true;
    errorMessage.hidden = true;

    try {
      const response = await fetch(form.action, {
        body: new URLSearchParams(new FormData(form)),
        headers: {
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded"
        },
        method: "POST"
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      form.reset();
    } catch (error) {
      errorMessage.hidden = false;
      errorMessage.textContent = error.message || "메시지를 보내지 못했습니다.";
    } finally {
      submitButton.disabled = false;
    }
  });
}
