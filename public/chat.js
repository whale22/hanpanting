/* global confirm, document, EventSource, fetch, FormData */

const chat = document.querySelector("[data-realtime-chat]");

if (chat) {
  const conversationId = chat.dataset.conversationId;
  const form = chat.querySelector("[data-chat-form]");
  const endForm = chat.querySelector("[data-end-chat-form]");
  const errorMessage = chat.querySelector("[data-chat-error]");
  const statusLabel = chat.querySelector("[data-conversation-status]");
  const eventSource = new EventSource(`/conversations/${conversationId}/events`);
  let conversationEnded = false;

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
    item.className = message.isSystem
      ? "message-item system-message"
      : message.isMyMessage
        ? "message-item my-message"
        : "message-item";
    item.dataset.messageId = message.id;

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

    if (message.isSystem) {
      item.append(body);
    } else {
      const avatar = document.createElement("div");
      avatar.className = "message-avatar";
      avatar.title = message.avatarCode;
      avatar.textContent = message.senderName.slice(0, 1);
      item.append(avatar, body);
    }

    getMessageList().append(item);
    item.scrollIntoView({ behavior: "smooth", block: "end" });
  }

  function finishConversation() {
    conversationEnded = true;
    eventSource.close();
    chat.removeAttribute("data-realtime-chat");
    statusLabel.textContent = "종료된 대화";
    form.remove();
    endForm.remove();
  }

  eventSource.addEventListener("message", (event) => {
    appendMessage(JSON.parse(event.data));
  });

  eventSource.addEventListener("conversation-ended", () => {
    finishConversation();
  });

  eventSource.addEventListener("error", () => {
    if (conversationEnded) {
      return;
    }

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

  endForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!confirm("종료한 채팅은 다시 시작할 수 없습니다. 종료할까요?")) {
      return;
    }

    const endButton = endForm.querySelector("button[type='submit']");
    endButton.disabled = true;
    errorMessage.hidden = true;

    try {
      const response = await fetch(endForm.action, {
        headers: { accept: "application/json" },
        method: "POST"
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      if (!conversationEnded) {
        finishConversation();
      }
    } catch (error) {
      errorMessage.hidden = false;
      errorMessage.textContent = error.message || "채팅을 종료하지 못했습니다.";
      endButton.disabled = false;
    }
  });
}
