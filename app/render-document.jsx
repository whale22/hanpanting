import { renderToStaticMarkup } from "react-dom/server";

import ConversationPage, {
  ConversationList
} from "./conversations/conversation-page.jsx";
import { Layout } from "./layout.jsx";
import LoginPage from "./login/page.jsx";
import MessagePage from "./message-page.jsx";
import Page from "./page.jsx";
import SignupPage from "./signup/page.jsx";

const pages = {
  conversationList: ConversationPage,
  home: Page,
  login: LoginPage,
  message: MessagePage,
  signup: SignupPage
};

export { ConversationList };

export function renderDocument({
  page,
  pageProperties = {},
  session = null,
  title = "한판팅"
}) {
  const PageComponent = pages[page];

  if (!PageComponent) {
    throw new Error(`등록되지 않은 페이지입니다: ${page}`);
  }

  return `<!doctype html>${renderToStaticMarkup(
    <Layout session={session} title={title}>
      <PageComponent {...pageProperties} />
    </Layout>
  )}`;
}
