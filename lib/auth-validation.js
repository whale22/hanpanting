const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLoginInput({ email, password }) {
  const normalizedEmail = String(email ?? "").trim().toLowerCase();
  const normalizedPassword = String(password ?? "");

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    return { ok: false, errorCode: "INVALID_EMAIL" };
  }

  if (normalizedPassword.length < 8 || normalizedPassword.length > 128) {
    return { ok: false, errorCode: "INVALID_PASSWORD" };
  }

  return {
    ok: true,
    value: {
      email: normalizedEmail,
      password: normalizedPassword
    }
  };
}

export function validateSignupInput({ email, password }) {
  const loginValidation = validateLoginInput({ email, password });

  if (!loginValidation.ok) {
    return loginValidation;
  }

  return {
    ok: true,
    value: {
      ...loginValidation.value,
      name: loginValidation.value.email
    }
  };
}
