const ERROR_MESSAGES = {
  INVALID_EMAIL: "이메일 형식을 확인해 주세요.",
  INVALID_PASSWORD: "비밀번호는 8자 이상 128자 이하여야 합니다.",
  LOGIN_FAILED: "이메일 또는 비밀번호가 맞지 않습니다."
};

export default function LoginPage({ accountCreated, errorCode }) {
  const errorMessage = ERROR_MESSAGES[errorCode];

  return (
    <section className="auth-panel">
      <p className="eyebrow">다시 만나기</p>
      <h1>로그인</h1>
      <p>계정 정보는 상대방에게 공개되지 않습니다.</p>

      {errorMessage && (
        <p className="form-error" role="alert">{errorMessage}</p>
      )}

      {accountCreated && (
        <p className="form-success" role="status">
          계정을 만들었습니다. 이제 로그인해 주세요.
        </p>
      )}

      <form action="/auth/login" method="post">
        <label htmlFor="email">
          이메일
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </label>
        <label htmlFor="password">
          비밀번호
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={8}
            maxLength={128}
            required
          />
        </label>
        <button type="submit">로그인</button>
      </form>

      <p className="auth-switch">
        처음 오셨나요? <a href="/signup">계정 만들기</a>
      </p>
    </section>
  );
}
