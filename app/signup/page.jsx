const ERROR_MESSAGES = {
  INVALID_EMAIL: "이메일 형식을 확인해 주세요.",
  INVALID_PASSWORD: "비밀번호는 8자 이상 128자 이하여야 합니다.",
  SIGNUP_FAILED: "계정을 만들 수 없습니다. 이미 가입한 이메일인지 확인해 주세요."
};

export default function SignupPage({ errorCode }) {
  const errorMessage = ERROR_MESSAGES[errorCode];

  return (
    <section className="auth-panel">
      <p className="eyebrow">대화 준비</p>
      <h1>계정 만들기</h1>
      <p>계정 정보는 상대방에게 공개되지 않습니다.</p>

      {errorMessage && (
        <p className="form-error" role="alert">{errorMessage}</p>
      )}

      <form action="/auth/signup" method="post">
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
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
          />
        </label>
        <button type="submit">가입하기</button>
      </form>

      <p className="auth-switch">
        이미 계정이 있나요? <a href="/login">로그인</a>
      </p>
    </section>
  );
}
